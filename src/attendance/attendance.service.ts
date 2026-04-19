import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  CreateAttendanceRecordDto,
  UpdateAttendanceRecordDto,
  BulkCreateAttendanceDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

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
        check_in_time: dto.check_in_time ? new Date(`1970-01-01T${dto.check_in_time}Z`) : null,
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

  async getActiveSessionsForStudent(userId: bigint) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
    });

    if (!student) {
      throw new NotFoundException('Sinh viên không tồn tại');
    }

    // Lấy các lớp học phần sinh viên đang học
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { student_id: student.id },
      select: { course_class_id: true }
    });

    if (enrollments.length === 0) return [];

    const courseClassIds = enrollments.map(e => e.course_class_id);

    // Xác định ngày hôm nay theo UTC midnight (do ngày điểm danh đang lưu dạng midnight UTC)
    const now = new Date();
    const todayMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Lấy các session của hôm nay
    const activeSessions = await this.prisma.attendanceSession.findMany({
      where: {
        course_class_id: { in: courseClassIds },
        date: todayMidnightUTC,
      },
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
        // Check xem SV đã điểm danh chưa
        records: {
          where: { student_id: student.id },
          select: { status: true, arrival_time: true },
        }
      },
      orderBy: { check_in_time: 'asc' },
    });

    return activeSessions;
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
    if (dto.check_in_time) data.check_in_time = new Date(`1970-01-01T${dto.check_in_time}Z`);
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

    const record = await this.prisma.attendanceRecord.create({
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

    // Emit event cho realtime WebSocket
    this.eventEmitter.emit('attendance.record.created', {
      sessionId: dto.session_id.toString(),
      record,
    });

    return record;
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

    const record = await this.prisma.attendanceRecord.update({
      where: { id },
      data,
      include: {
        session: { select: { id: true } },
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

    // Emit event cho realtime WebSocket
    this.eventEmitter.emit('attendance.record.updated', {
      sessionId: record.session.id.toString(),
      record,
    });

    return record;
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

    const bulkResult = await this.prisma.$transaction(async (tx) => {
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

    // Emit event cho realtime WebSocket (sau khi transaction hoàn tất)
    this.eventEmitter.emit('attendance.records.bulk_created', {
      sessionId: dto.session_id.toString(),
      records: bulkResult,
    });

    return bulkResult;
  }

  // ===================== AUTO GENERATE SESSIONS =====================

  /**
   * Tự động sinh các buổi điểm danh cho lớp học phần dựa trên lịch học.
   * - lesson_slot format: "7:00-9:00" (lấy phần trước dấu "-" làm check_in_time)
   * - day_of_week: 2=Thứ 2, 3=Thứ 3, ..., 8=Chủ nhật
   * - Duyệt từng ngày trong khoảng [start_date, end_date], tạo session cho ngày nào khớp day_of_week
   * @param courseClassId - ID lớp học phần
   * @param clearExisting - Nếu true, xóa các session cũ chưa có record trước khi tạo mới
   */
  async generateSessionsForClass(courseClassId: bigint, clearExisting = false) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
    });

    if (!courseClass) {
      throw new NotFoundException(`Lớp học phần với ID ${courseClassId} không tồn tại`);
    }

    if (!courseClass.start_date || !courseClass.end_date) {
      throw new BadRequestException('Lớp học phần chưa có ngày bắt đầu / kết thúc');
    }

    if (!courseClass.lesson_slot) {
      throw new BadRequestException('Lớp học phần chưa có thông tin kíp học (lesson_slot)');
    }

    // Parse check_in_time từ lesson_slot "7:00-9:00" -> "07:00:00"
    const slotStart = courseClass.lesson_slot.split('-')[0].trim(); // "7:00"
    const [hourStr, minuteStr] = slotStart.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr ?? '0', 10);

    if (isNaN(hour) || isNaN(minute)) {
      throw new BadRequestException(
        `Không thể đọc thời gian từ lesson_slot: "${courseClass.lesson_slot}". Định dạng hợp lệ: "7:00-9:00"`,
      );
    }

    // Tạo Date object đại diện cho check_in_time theo chuẩn UTC để lưu vào DB chính xác
    const checkInTime = new Date(Date.UTC(1970, 0, 1, hour, minute, 0));

    // Map day_of_week trong DB (2-8) sang getDay() của JS (0-6)
    // 2=Thứ 2 -> JS day 1, 3=Thứ 3 -> 2, ..., 7=Thứ 7 -> 6, 8=CN -> 0
    const dbDayToJsDay: Record<number, number> = {
      2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 0,
    };
    const targetJsDay = dbDayToJsDay[courseClass.day_of_week];

    if (targetJsDay === undefined) {
      throw new BadRequestException(
        `Giá trị day_of_week không hợp lệ: ${courseClass.day_of_week}. Hợp lệ: 2-8`,
      );
    }

    // Xóa sessions cũ (chưa có record điểm danh) nếu yêu cầu
    if (clearExisting) {
      const sessionsWithNoRecords = await this.prisma.attendanceSession.findMany({
        where: {
          course_class_id: courseClassId,
          records: { none: {} },
        },
        select: { id: true },
      });

      if (sessionsWithNoRecords.length > 0) {
        await this.prisma.attendanceSession.deleteMany({
          where: {
            id: { in: sessionsWithNoRecords.map((s) => s.id) },
          },
        });
      }
    }

    // Lấy danh sách ngày đã có session để tránh tạo trùng
    const existingSessions = await this.prisma.attendanceSession.findMany({
      where: { course_class_id: courseClassId },
      select: { date: true },
    });
    const existingDates = new Set(
      existingSessions
        .filter((s) => s.date !== null)
        .map((s) => s.date!.toISOString().split('T')[0]),
    );

    // Duyệt từng ngày từ start_date đến end_date
    const sessions: { course_class_id: bigint; date: Date; check_in_time: Date }[] = [];
    const startDate = new Date(courseClass.start_date);
    const endDate = new Date(courseClass.end_date);

    // Normalize về UTC midnight để tránh lỗi timezone
    const current = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
    );
    const end = new Date(
      Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
    );

    while (current <= end) {
      if (current.getUTCDay() === targetJsDay) {
        const dateStr = current.toISOString().split('T')[0];
        if (!existingDates.has(dateStr)) {
          sessions.push({
            course_class_id: courseClassId,
            date: new Date(current),
            check_in_time: checkInTime,
          });
        }
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    if (sessions.length === 0) {
      return {
        message: 'Không có buổi học nào mới cần tạo (đã tồn tại hoặc không có ngày phù hợp)',
        created: 0,
      };
    }

    await this.prisma.attendanceSession.createMany({
      data: sessions,
      skipDuplicates: true,
    });

    return {
      message: `Đã tạo thành công ${sessions.length} buổi điểm danh cho lớp học phần`,
      created: sessions.length,
      sessions: sessions.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        check_in_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`,
      })),
    };
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
