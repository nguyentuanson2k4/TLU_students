import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FaceEngineService } from './face-engine.service';
import { CloudinaryService } from './cloudinary.service';
import { AttendanceMethod } from '@prisma/client';

const MAX_FACES_PER_STUDENT = 5;
const DEFAULT_THRESHOLD = 0.6;

@Injectable()
export class FaceRecognitionService {
  private readonly logger = new Logger(FaceRecognitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly faceEngine: FaceEngineService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ===================== FACE REGISTRATION =====================

  /**
   * Đăng ký khuôn mặt cho sinh viên.
   * 1. Validate sinh viên tồn tại
   * 2. Kiểm tra giới hạn số ảnh
   * 3. Extract embedding từ ảnh qua Python service
   * 4. Upload ảnh lên Cloudinary
   * 5. Lưu vào DB (student_faces)
   */
  async registerFace(studentId: bigint, file: Express.Multer.File, note?: string) {
    // 1. Validate sinh viên
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(`Sinh viên với ID ${studentId} không tồn tại`);
    }

    // 2. Kiểm tra giới hạn
    const existingFaces = await this.prisma.studentFace.count({
      where: { student_id: studentId },
    });

    if (existingFaces >= MAX_FACES_PER_STUDENT) {
      throw new BadRequestException(
        `Sinh viên đã đăng ký đủ ${MAX_FACES_PER_STUDENT} ảnh khuôn mặt. Vui lòng xóa ảnh cũ trước.`,
      );
    }

    // 3. Extract embedding
    this.logger.log(`Extracting face embedding for student ${student.student_code}...`);
    const embeddingResult = await this.faceEngine.extractEmbedding(file.buffer);

    if (!embeddingResult.success) {
      throw new BadRequestException('Không thể trích xuất khuôn mặt từ ảnh');
    }

    // 4. Upload lên Cloudinary
    this.logger.log(`Uploading face image to Cloudinary for ${student.student_code}...`);
    const uploadResult = await this.cloudinary.uploadFaceImage(file, student.student_code);

    // 5. Lưu vào DB - sử dụng raw SQL vì Prisma không hỗ trợ trực tiếp vector type
    const embeddingStr = `[${embeddingResult.embedding.join(',')}]`;

    const face = await this.prisma.$queryRawUnsafe(
      `INSERT INTO student_faces (student_id, image_url, embedding_vector, created_at)
       VALUES ($1, $2, $3::vector, NOW())
       RETURNING id, student_id, image_url, created_at`,
      studentId,
      uploadResult.secure_url,
      embeddingStr,
    );

    this.logger.log(
      `Face registered for student ${student.student_code}: confidence=${embeddingResult.confidence}`,
    );

    return {
      message: 'Đăng ký khuôn mặt thành công',
      face: (face as any[])[0],
      confidence: embeddingResult.confidence,
      total_faces: existingFaces + 1,
    };
  }

  /**
   * Lấy danh sách ảnh khuôn mặt của sinh viên.
   */
  async getStudentFaces(studentId: bigint) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, student_code: true, full_name: true },
    });

    if (!student) {
      throw new NotFoundException(`Sinh viên với ID ${studentId} không tồn tại`);
    }

    const faces = await this.prisma.$queryRawUnsafe(
      `SELECT id, student_id, image_url, created_at
       FROM student_faces
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      studentId,
    );

    return {
      student,
      faces,
      total: (faces as any[]).length,
      max_allowed: MAX_FACES_PER_STUDENT,
    };
  }

  /**
   * Xóa ảnh khuôn mặt.
   */
  async deleteFace(faceId: bigint) {
    const face = await this.prisma.studentFace.findUnique({
      where: { id: faceId },
    });

    if (!face) {
      throw new NotFoundException(`Không tìm thấy ảnh khuôn mặt với ID ${faceId}`);
    }

    // Xóa ảnh trên Cloudinary
    const publicId = this.cloudinary.extractPublicId(face.image_url);
    if (publicId) {
      await this.cloudinary.deleteImage(publicId);
    }

    // Xóa trong DB
    await this.prisma.studentFace.delete({
      where: { id: faceId },
    });

    return { message: 'Đã xóa ảnh khuôn mặt thành công' };
  }

  // ===================== FACE ATTENDANCE =====================

  /**
   * Điểm danh bằng nhận diện khuôn mặt (1 sinh viên).
   * 1. Lấy session và danh sách SV enrolled
   * 2. Lấy embeddings của các SV enrolled
   * 3. Extract embedding từ ảnh upload
   * 4. So sánh và tìm best match
   * 5. Tạo attendance record
   */
  async recognizeAndAttend(
    sessionId: bigint,
    file: Express.Multer.File,
    threshold?: number,
  ) {
    const similarityThreshold = threshold || DEFAULT_THRESHOLD;

    // 1. Validate session
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        course_class: {
          include: {
            enrollments: {
              select: { student_id: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Buổi điểm danh ${sessionId} không tồn tại`);
    }

    const enrolledStudentIds = session.course_class.enrollments.map(
      (e) => e.student_id,
    );

    if (enrolledStudentIds.length === 0) {
      throw new BadRequestException('Chưa có sinh viên nào đăng ký lớp học phần này');
    }

    // 2. Lấy embeddings - sử dụng raw SQL cho vector type
    const knownFaces = (await this.prisma.$queryRawUnsafe(
      `SELECT id, student_id, embedding_vector::text as embedding_text
       FROM student_faces
       WHERE student_id = ANY($1::bigint[])
       AND embedding_vector IS NOT NULL`,
      enrolledStudentIds,
    )) as Array<{ id: bigint; student_id: bigint; embedding_text: string }>;

    if (knownFaces.length === 0) {
      throw new BadRequestException(
        'Chưa có sinh viên nào trong lớp đăng ký khuôn mặt. Vui lòng đăng ký khuôn mặt trước.',
      );
    }

    // Parse embeddings
    const knownEmbeddings = knownFaces.map((face) => ({
      id: face.id,
      student_id: face.student_id,
      embedding: JSON.parse(face.embedding_text) as number[],
    }));

    // 3. Extract embedding từ ảnh upload
    this.logger.log('Extracting face embedding for attendance...');
    const extractResult = await this.faceEngine.extractEmbedding(file.buffer);

    // 4. Tìm best match
    const matchResult = this.faceEngine.findBestMatch(
      extractResult.embedding,
      knownEmbeddings,
      similarityThreshold,
    );

    if (!matchResult.matched) {
      // Upload ảnh làm evidence dù không match
      const evidenceUpload = await this.cloudinary.uploadEvidenceImage(
        file,
        sessionId.toString(),
      );

      return {
        success: false,
        message: 'Không nhận diện được sinh viên nào phù hợp',
        best_similarity: matchResult.similarity,
        threshold: similarityThreshold,
        evidence_url: evidenceUpload.secure_url,
      };
    }

    // 5. Kiểm tra đã điểm danh chưa
    const existingRecord = await this.prisma.attendanceRecord.findUnique({
      where: {
        session_id_student_id: {
          session_id: sessionId,
          student_id: matchResult.studentId!,
        },
      },
    });

    if (existingRecord) {
      const student = await this.prisma.student.findUnique({
        where: { id: matchResult.studentId! },
        select: { student_code: true, full_name: true },
      });

      return {
        success: true,
        message: 'Sinh viên đã được điểm danh trước đó',
        already_attended: true,
        student,
        similarity: matchResult.similarity,
        record: existingRecord,
      };
    }

    // Upload ảnh làm evidence
    const evidenceUpload = await this.cloudinary.uploadEvidenceImage(
      file,
      sessionId.toString(),
    );

    // 6. Tạo attendance record
    const record = await this.prisma.attendanceRecord.create({
      data: {
        session_id: sessionId,
        student_id: matchResult.studentId!,
        arrival_time: new Date(),
        status: 1, // Có mặt
        confidence_score: matchResult.similarity,
        is_manual_override: false,
        evidence_url: evidenceUpload.secure_url,
        attendance_method: AttendanceMethod.FACE_ID,
        note: `Điểm danh tự động bằng Face ID (similarity: ${matchResult.similarity.toFixed(4)})`,
      },
      include: {
        student: {
          select: {
            id: true,
            student_code: true,
            full_name: true,
            class_name: true,
          },
        },
      },
    });

    this.logger.log(
      `Attendance recorded: student=${record.student.student_code}, similarity=${matchResult.similarity}`,
    );

    return {
      success: true,
      message: `Điểm danh thành công cho ${record.student.full_name}`,
      already_attended: false,
      student: record.student,
      similarity: matchResult.similarity,
      record,
    };
  }

  /**
   * Điểm danh nhóm - nhận diện nhiều khuôn mặt trong 1 ảnh.
   */
  async recognizeGroupAttendance(
    sessionId: bigint,
    file: Express.Multer.File,
    threshold?: number,
  ) {
    const similarityThreshold = threshold || DEFAULT_THRESHOLD;

    // 1. Validate session
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        course_class: {
          include: {
            enrollments: {
              select: { student_id: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Buổi điểm danh ${sessionId} không tồn tại`);
    }

    const enrolledStudentIds = session.course_class.enrollments.map(
      (e) => e.student_id,
    );

    // 2. Lấy embeddings
    const knownFaces = (await this.prisma.$queryRawUnsafe(
      `SELECT id, student_id, embedding_vector::text as embedding_text
       FROM student_faces
       WHERE student_id = ANY($1::bigint[])
       AND embedding_vector IS NOT NULL`,
      enrolledStudentIds,
    )) as Array<{ id: bigint; student_id: bigint; embedding_text: string }>;

    if (knownFaces.length === 0) {
      throw new BadRequestException(
        'Chưa có sinh viên nào trong lớp đăng ký khuôn mặt.',
      );
    }

    const knownEmbeddings = knownFaces.map((face) => ({
      id: face.id,
      student_id: face.student_id,
      embedding: JSON.parse(face.embedding_text) as number[],
    }));

    // 3. Extract ALL embeddings từ ảnh nhóm
    this.logger.log('Extracting all face embeddings from group photo...');
    const extractResult = await this.faceEngine.extractAllEmbeddings(file.buffer);

    // Upload evidence
    const evidenceUpload = await this.cloudinary.uploadEvidenceImage(
      file,
      sessionId.toString(),
    );

    // 4. Match từng face
    const results: Array<{
      face_index: number;
      matched: boolean;
      student?: any;
      similarity: number;
      status: string;
    }> = [];

    const matchedStudentIds = new Set<string>();

    for (let i = 0; i < extractResult.faces.length; i++) {
      const faceEmbedding = extractResult.faces[i].embedding;
      const match = this.faceEngine.findBestMatch(
        faceEmbedding,
        knownEmbeddings,
        similarityThreshold,
      );

      if (match.matched && !matchedStudentIds.has(match.studentId!.toString())) {
        matchedStudentIds.add(match.studentId!.toString());

        // Kiểm tra đã điểm danh chưa
        const existing = await this.prisma.attendanceRecord.findUnique({
          where: {
            session_id_student_id: {
              session_id: sessionId,
              student_id: match.studentId!,
            },
          },
        });

        if (existing) {
          const student = await this.prisma.student.findUnique({
            where: { id: match.studentId! },
            select: { id: true, student_code: true, full_name: true },
          });

          results.push({
            face_index: i,
            matched: true,
            student,
            similarity: match.similarity,
            status: 'already_attended',
          });
        } else {
          // Tạo attendance record
          const record = await this.prisma.attendanceRecord.create({
            data: {
              session_id: sessionId,
              student_id: match.studentId!,
              arrival_time: new Date(),
              status: 1,
              confidence_score: match.similarity,
              is_manual_override: false,
              evidence_url: evidenceUpload.secure_url,
              attendance_method: AttendanceMethod.FACE_ID,
              note: `Điểm danh tự động (nhóm) - Face #${i + 1} (similarity: ${match.similarity.toFixed(4)})`,
            },
            include: {
              student: {
                select: { id: true, student_code: true, full_name: true },
              },
            },
          });

          results.push({
            face_index: i,
            matched: true,
            student: record.student,
            similarity: match.similarity,
            status: 'attended',
          });
        }
      } else {
        results.push({
          face_index: i,
          matched: false,
          similarity: match.similarity,
          status: 'not_recognized',
        });
      }
    }

    const newlyAttended = results.filter((r) => r.status === 'attended').length;
    const alreadyAttended = results.filter((r) => r.status === 'already_attended').length;
    const notRecognized = results.filter((r) => r.status === 'not_recognized').length;

    return {
      success: true,
      message: `Đã điểm danh ${newlyAttended} sinh viên mới từ ảnh nhóm`,
      summary: {
        total_faces_detected: extractResult.face_count,
        newly_attended: newlyAttended,
        already_attended: alreadyAttended,
        not_recognized: notRecognized,
      },
      evidence_url: evidenceUpload.secure_url,
      results,
    };
  }

  /**
   * Xác minh khuôn mặt - chỉ kiểm tra match, không điểm danh.
   */
  async verifyFace(studentId: bigint, file: Express.Multer.File) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, student_code: true, full_name: true },
    });

    if (!student) {
      throw new NotFoundException(`Sinh viên với ID ${studentId} không tồn tại`);
    }

    // Lấy embeddings của sinh viên
    const studentFaces = (await this.prisma.$queryRawUnsafe(
      `SELECT id, embedding_vector::text as embedding_text
       FROM student_faces
       WHERE student_id = $1
       AND embedding_vector IS NOT NULL`,
      studentId,
    )) as Array<{ id: bigint; embedding_text: string }>;

    if (studentFaces.length === 0) {
      throw new BadRequestException(
        'Sinh viên chưa đăng ký khuôn mặt. Vui lòng đăng ký trước.',
      );
    }

    // Extract embedding
    const extractResult = await this.faceEngine.extractEmbedding(file.buffer);

    // So sánh
    const knownEmbeddings = studentFaces.map((face) => ({
      id: face.id,
      student_id: studentId,
      embedding: JSON.parse(face.embedding_text) as number[],
    }));

    const match = this.faceEngine.findBestMatch(
      extractResult.embedding,
      knownEmbeddings,
      DEFAULT_THRESHOLD,
    );

    return {
      verified: match.matched,
      student,
      similarity: match.similarity,
      threshold: DEFAULT_THRESHOLD,
      message: match.matched
        ? `Xác minh thành công - Đây là ${student.full_name}`
        : 'Xác minh thất bại - Khuôn mặt không khớp',
    };
  }

  /**
   * Health check cho Face Service.
   */
  async checkFaceServiceHealth() {
    return this.faceEngine.healthCheck();
  }
}
