import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto, UpdateGradeDto } from './dto/grade.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tính điểm tổng kết hệ 10
   * Công thức: chuyên cần * 0.1 + quá trình * 0.3 + cuối kỳ * 0.6
   */
  private calculateTotal(attendance: number, process: number, finalScore: number): number {
    return Math.round((attendance * 0.1 + process * 0.3 + finalScore * 0.6) * 100) / 100;
  }

  private serializeGrade(grade: any) {
    return {
      ...grade,
      id: grade.id.toString(),
      student_id: grade.student_id.toString(),
      course_class_id: grade.course_class_id.toString(),
      enrollment_id: grade.enrollment_id.toString(),
      score_attendance: Number(grade.score_attendance),
      score_process: Number(grade.score_process),
      score_final: Number(grade.score_final),
      score_total_10: Number(grade.score_total_10),
      student: grade.student
        ? {
            ...grade.student,
            id: grade.student.id.toString(),
            user_id: grade.student.user_id.toString(),
          }
        : undefined,
      course_class: grade.course_class
        ? {
            ...grade.course_class,
            id: grade.course_class.id.toString(),
            subject_id: grade.course_class.subject_id.toString(),
            lecturer_id: grade.course_class.lecturer_id.toString(),
            semester_id: grade.course_class.semester_id.toString(),
          }
        : undefined,
      enrollment: grade.enrollment
        ? {
            ...grade.enrollment,
            id: grade.enrollment.id.toString(),
            student_id: grade.enrollment.student_id.toString(),
            course_class_id: grade.enrollment.course_class_id.toString(),
          }
        : undefined,
    };
  }

  async create(data: CreateGradeDto) {
    // Kiểm tra đã có điểm cho enrollment này chưa
    const existing = await this.prisma.grade.findFirst({
      where: {
        student_id: BigInt(data.student_id),
        course_class_id: BigInt(data.course_class_id),
        enrollment_id: BigInt(data.enrollment_id),
      },
    });
    if (existing) {
      throw new ConflictException('Điểm đã tồn tại cho sinh viên trong lớp học phần này.');
    }

    const attendance = data.score_attendance ?? 0;
    const process = data.score_process ?? 0;
    const finalScore = data.score_final ?? 0;
    const total = this.calculateTotal(attendance, process, finalScore);

    const grade = await this.prisma.grade.create({
      data: {
        student_id: BigInt(data.student_id),
        course_class_id: BigInt(data.course_class_id),
        enrollment_id: BigInt(data.enrollment_id),
        score_attendance: attendance,
        score_process: process,
        score_final: finalScore,
        score_total_10: total,
      },
      include: {
        student: true,
        course_class: { include: { subject: true } },
      },
    });

    return this.serializeGrade(grade);
  }

  async findAll() {
    const grades = await this.prisma.grade.findMany({
      include: {
        student: true,
        course_class: { include: { subject: true } },
      },
    });

    return grades.map((g) => this.serializeGrade(g));
  }

  async findById(id: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: BigInt(id) },
      include: {
        student: true,
        course_class: { include: { subject: true } },
      },
    });

    if (!grade) {
      throw new NotFoundException(`Không tìm thấy điểm với ID ${id}`);
    }

    return this.serializeGrade(grade);
  }

  async findByStudent(studentId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { student_id: BigInt(studentId) },
      include: {
        course_class: { include: { subject: true, semester: true } },
      },
    });

    return grades.map((g) => this.serializeGrade(g));
  }

  async findByCourseClass(courseClassId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { course_class_id: BigInt(courseClassId) },
      include: {
        student: true,
      },
    });

    return grades.map((g) => this.serializeGrade(g));
  }

  /**
   * Sinh viên xem điểm của mình (dựa vào user_id từ JWT)
   */
  async findMyGrades(userId: string | bigint) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: typeof userId === 'string' ? BigInt(userId) : userId },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy hồ sơ sinh viên.');
    }

    const grades = await this.prisma.grade.findMany({
      where: { student_id: student.id },
      include: {
        course_class: { include: { subject: true, semester: true } },
      },
    });

    return grades.map((g) => this.serializeGrade(g));
  }

  async update(id: string, data: UpdateGradeDto) {
    const existing = await this.prisma.grade.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy điểm với ID ${id}`);
    }

    const attendance = data.score_attendance ?? Number(existing.score_attendance);
    const process = data.score_process ?? Number(existing.score_process);
    const finalScore = data.score_final ?? Number(existing.score_final);
    const total = this.calculateTotal(attendance, process, finalScore);

    const updateData: any = {};
    if (data.score_attendance !== undefined) updateData.score_attendance = data.score_attendance;
    if (data.score_process !== undefined) updateData.score_process = data.score_process;
    if (data.score_final !== undefined) updateData.score_final = data.score_final;
    updateData.score_total_10 = total;

    const grade = await this.prisma.grade.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        student: true,
        course_class: { include: { subject: true } },
      },
    });

    return this.serializeGrade(grade);
  }

  async remove(id: string) {
    const existing = await this.prisma.grade.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy điểm với ID ${id}`);
    }

    await this.prisma.grade.delete({
      where: { id: BigInt(id) },
    });

    return { message: `Đã xóa điểm với ID ${id}` };
  }
}
