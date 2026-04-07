import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  CreateAttendanceRecordDto,
  UpdateAttendanceRecordDto,
  BulkCreateAttendanceDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) { }

  // ===================== ATTENDANCE SESSION =====================

  async createSession(dto: CreateAttendanceSessionDto) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: BigInt(dto.course_class_id) },
    });

    if (!courseClass) {
      throw new NotFoundException('Lớp học phần không tồn tại');
    }

    return this.prisma.attendanceSession.create({
      data: {
        course_class_id: BigInt(dto.course_class_id),
        check_in_time: dto.check_in_time ? new Date(`1970-01-01T${dto.check_in_time}`) : null,
        date: dto.date ? new Date(dto.date) : null,
      },
    });
  }

  async findAllSessions() {
    return this.prisma.attendanceSession.findMany({
      include: {
        course_class: {
          include: {
            subject: {
              select: { subject_code: true, subject_name: true },
            },
            lecturer: {
              select: { lecturer_code: true, full_name: true },
            },
          },
        },
        _count: {
          select: { records: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findSessionsByCourseClass(courseClassId: bigint) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
    });

    if (!courseClass) {
      throw new NotFoundException('Lớp học phần không tồn tại');
    }

    return this.prisma.attendanceSession.findMany({
      where: { course_class_id: courseClassId },
      include: {
        _count: {
          select: { records: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOneSession(id: bigint) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        course_class: {
          include: {
            subject: {
              select: { subject_code: true, subject_name: true },
            },
            lecturer: {
              select: { lecturer_code: true, full_name: true },
            },
          },
        },
        records: {
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
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Không tìm thấy buổi điểm danh với ID ${id}`);
    }

    return session;
  }

  async updateSession(id: bigint, dto: UpdateAttendanceSessionDto) {
    await this.findOneSession(id);

    const data: any = {};
    if (dto.course_class_id) data.course_class_id = BigInt(dto.course_class_id);
    if (dto.check_in_time) data.check_in_time = new Date(`1970-01-01T${dto.check_in_time}`);
    if (dto.date) data.date = new Date(dto.date);

    return this.prisma.attendanceSession.update({
      where: { id },
      data,
    });
  }

  async removeSession(id: bigint) {
    await this.findOneSession(id);

    // Xóa tất cả records liên quan trước khi xóa session
    await this.prisma.attendanceRecord.deleteMany({
      where: { session_id: id },
    });

    return this.prisma.attendanceSession.delete({
      where: { id },
    });
  }

  // ===================== ATTENDANCE RECORD =====================

  async createRecord(dto: CreateAttendanceRecordDto) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: BigInt(dto.session_id) },
    });

    if (!session) {
      throw new NotFoundException('Buổi điểm danh không tồn tại');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: BigInt(dto.student_id) },
    });

    if (!student) {
      throw new NotFoundException('Sinh viên không tồn tại');
    }

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        session_id_student_id: {
          session_id: BigInt(dto.session_id),
          student_id: BigInt(dto.student_id),
        },
      },
    });

    if (existing) {
      throw new ConflictException('Sinh viên đã được điểm danh trong buổi này');
    }

    return this.prisma.attendanceRecord.create({
      data: {
        session_id: BigInt(dto.session_id),
        student_id: BigInt(dto.student_id),
        arrival_time: dto.arrival_time ? new Date(dto.arrival_time) : null,
        status: dto.status,
        confidence_score: dto.confidence_score ?? 0,
        is_manual_override: dto.is_manual_override ?? false,
        evidence_url: dto.evidence_url,
        attendance_method: dto.attendance_method ?? 'FACE_ID',
        updated_by: dto.updated_by ? BigInt(dto.updated_by) : null,
        note: dto.note,
      },
    });
  }

  async findRecordsBySession(sessionId: bigint) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Buổi điểm danh không tồn tại');
    }

    return this.prisma.attendanceRecord.findMany({
      where: { session_id: sessionId },
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
      orderBy: { created_at: 'asc' },
    });
  }

  async findRecordsByStudent(studentId: bigint) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Sinh viên không tồn tại');
    }

    return this.prisma.attendanceRecord.findMany({
      where: { student_id: studentId },
      include: {
        session: {
          include: {
            course_class: {
              include: {
                subject: {
                  select: { subject_code: true, subject_name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOneRecord(id: bigint) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            course_class: {
              include: {
                subject: {
                  select: { subject_code: true, subject_name: true },
                },
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            student_code: true,
            full_name: true,
            class_name: true,
          },
        },
        updater: {
          select: { id: true, username: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Không tìm thấy bản ghi điểm danh với ID ${id}`);
    }

    return record;
  }

  async updateRecord(id: bigint, dto: UpdateAttendanceRecordDto) {
    await this.findOneRecord(id);

    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.arrival_time) data.arrival_time = new Date(dto.arrival_time);
    if (dto.confidence_score !== undefined) data.confidence_score = dto.confidence_score;
    if (dto.is_manual_override !== undefined) data.is_manual_override = dto.is_manual_override;
    if (dto.evidence_url !== undefined) data.evidence_url = dto.evidence_url;
    if (dto.attendance_method) data.attendance_method = dto.attendance_method;
    if (dto.updated_by) data.updated_by = BigInt(dto.updated_by);
    if (dto.note !== undefined) data.note = dto.note;

    return this.prisma.attendanceRecord.update({
      where: { id },
      data,
    });
  }

  async removeRecord(id: bigint) {
    await this.findOneRecord(id);
    return this.prisma.attendanceRecord.delete({
      where: { id },
    });
  }

  // ===================== BULK ATTENDANCE =====================

  async bulkCreateRecords(dto: BulkCreateAttendanceDto) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: BigInt(dto.session_id) },
    });

    if (!session) {
      throw new NotFoundException('Buổi điểm danh không tồn tại');
    }

    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const item of dto.records) {
        const student = await tx.student.findUnique({
          where: { id: BigInt(item.student_id) },
        });

        if (!student) {
          throw new NotFoundException(`Sinh viên với ID ${item.student_id} không tồn tại`);
        }

        const record = await tx.attendanceRecord.upsert({
          where: {
            session_id_student_id: {
              session_id: BigInt(dto.session_id),
              student_id: BigInt(item.student_id),
            },
          },
          update: {
            status: item.status,
            note: item.note,
            attendance_method: item.attendance_method ?? 'MANUAL',
            is_manual_override: true,
          },
          create: {
            session_id: BigInt(dto.session_id),
            student_id: BigInt(item.student_id),
            status: item.status,
            note: item.note,
            attendance_method: item.attendance_method ?? 'MANUAL',
            is_manual_override: true,
          },
        });

        results.push(record);
      }

      return results;
    });
  }

  // ===================== STATISTICS =====================

  async getAttendanceStatsBySession(sessionId: bigint) {
    const session = await this.findOneSession(sessionId);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { session_id: sessionId },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 1).length;
    const late = records.filter((r) => r.status === 2).length;
    const absent = records.filter((r) => r.status === 0).length;
    const excused = records.filter((r) => r.status === 3).length;

    return {
      session,
      stats: {
        total,
        present,
        late,
        absent,
        excused,
        attendance_rate: total > 0 ? ((present + late) / total) * 100 : 0,
      },
    };
  }

  async getStudentAttendanceStats(studentId: bigint, courseClassId?: bigint) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Sinh viên không tồn tại');
    }

    const whereCondition: any = { student_id: studentId };
    if (courseClassId) {
      whereCondition.session = { course_class_id: courseClassId };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: whereCondition,
      include: {
        session: {
          include: {
            course_class: {
              include: {
                subject: {
                  select: { subject_code: true, subject_name: true },
                },
              },
            },
          },
        },
      },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 1).length;
    const late = records.filter((r) => r.status === 2).length;
    const absent = records.filter((r) => r.status === 0).length;
    const excused = records.filter((r) => r.status === 3).length;

    return {
      student: {
        id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
      },
      stats: {
        total,
        present,
        late,
        absent,
        excused,
        attendance_rate: total > 0 ? ((present + late) / total) * 100 : 0,
      },
      records,
    };
  }
}
