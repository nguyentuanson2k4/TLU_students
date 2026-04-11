import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GpaHistoryService {
  constructor(private prisma: PrismaService) {}

  private serializeGpaHistory(record: any) {
    return {
      ...record,
      id: record.id.toString(),
      student_id: record.student_id.toString(),
      semester_id: record.semester_id.toString(),
      gpa_semester: Number(record.gpa_semester),
      gpa_cumulative: Number(record.gpa_cumulative),
      student: record.student
        ? {
            ...record.student,
            id: record.student.id.toString(),
            user_id: record.student.user_id.toString(),
          }
        : undefined,
      semester: record.semester
        ? {
            ...record.semester,
            id: record.semester.id.toString(),
          }
        : undefined,
    };
  }

  async findAll() {
    const records = await this.prisma.gpaHistory.findMany({
      include: {
        student: true,
        semester: true,
      },
    });

    return records.map((r) => this.serializeGpaHistory(r));
  }

  async findById(id: string) {
    const record = await this.prisma.gpaHistory.findUnique({
      where: { id: BigInt(id) },
      include: {
        student: true,
        semester: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`Không tìm thấy lịch sử GPA với ID ${id}`);
    }

    return this.serializeGpaHistory(record);
  }

  async findByStudent(studentId: string) {
    const records = await this.prisma.gpaHistory.findMany({
      where: { student_id: BigInt(studentId) },
      include: { semester: true },
      orderBy: { semester: { id: 'asc' } },
    });

    return records.map((r) => this.serializeGpaHistory(r));
  }

  async findBySemester(semesterId: string) {
    const records = await this.prisma.gpaHistory.findMany({
      where: { semester_id: BigInt(semesterId) },
      include: { student: true },
      orderBy: { gpa_semester: 'desc' },
    });

    return records.map((r) => this.serializeGpaHistory(r));
  }

  /**
   * Sinh viên xem GPA của mình (dựa vào user_id từ JWT)
   */
  async findMyGpaHistory(userId: string | bigint) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: typeof userId === 'string' ? BigInt(userId) : userId },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy hồ sơ sinh viên.');
    }

    const records = await this.prisma.gpaHistory.findMany({
      where: { student_id: student.id },
      include: { semester: true },
      orderBy: { semester: { id: 'asc' } },
    });

    return records.map((r) => this.serializeGpaHistory(r));
  }
}
