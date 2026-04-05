import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGpaHistoryDto, UpdateGpaHistoryDto } from './dto/gpa-history.dto';

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

  async create(data: CreateGpaHistoryDto) {
    // Kiểm tra đã có GPA cho student + semester này chưa (unique constraint)
    const existing = await this.prisma.gpaHistory.findUnique({
      where: {
        student_id_semester_id: {
          student_id: BigInt(data.student_id),
          semester_id: BigInt(data.semester_id),
        },
      },
    });

    if (existing) {
      throw new ConflictException('GPA đã tồn tại cho sinh viên trong học kỳ này.');
    }

    const record = await this.prisma.gpaHistory.create({
      data: {
        student_id: BigInt(data.student_id),
        semester_id: BigInt(data.semester_id),
        gpa_semester: data.gpa_semester ?? 0,
        gpa_cumulative: data.gpa_cumulative ?? 0,
      },
      include: {
        student: true,
        semester: true,
      },
    });

    return this.serializeGpaHistory(record);
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

  async update(id: string, data: UpdateGpaHistoryDto) {
    const existing = await this.prisma.gpaHistory.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy lịch sử GPA với ID ${id}`);
    }

    const updateData: any = {};
    if (data.gpa_semester !== undefined) updateData.gpa_semester = data.gpa_semester;
    if (data.gpa_cumulative !== undefined) updateData.gpa_cumulative = data.gpa_cumulative;

    const record = await this.prisma.gpaHistory.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        student: true,
        semester: true,
      },
    });

    return this.serializeGpaHistory(record);
  }

  async remove(id: string) {
    const existing = await this.prisma.gpaHistory.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy lịch sử GPA với ID ${id}`);
    }

    await this.prisma.gpaHistory.delete({
      where: { id: BigInt(id) },
    });

    return { message: `Đã xóa lịch sử GPA với ID ${id}` };
  }
}
