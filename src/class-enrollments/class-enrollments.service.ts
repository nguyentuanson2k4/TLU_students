import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateClassEnrollmentDto, UpdateClassEnrollmentDto } from './dto/class-enrollment.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassEnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClassEnrollmentDto: CreateClassEnrollmentDto) {
    const student_id = BigInt(createClassEnrollmentDto.student_id);
    const course_class_id = BigInt(createClassEnrollmentDto.course_class_id);

    return this.prisma.$transaction(async (tx) => {
      const courseClass = await tx.courseClass.findUnique({
        where: { id: course_class_id },
      });

      if (!courseClass) {
        throw new NotFoundException('Lớp học phần không tồn tại');
      }

      if (courseClass.max_students !== null && courseClass.current_students !== null && courseClass.current_students >= courseClass.max_students) {
        throw new BadRequestException('Lớp học phần đã đủ số lượng sinh viên');
      }

      const existing = await tx.classEnrollment.findUnique({
        where: {
          student_id_course_class_id: { student_id, course_class_id },
        },
      });

      if (existing) {
        throw new ConflictException('Sinh viên đã đăng ký lớp học phần này');
      }

      const enrollment = await tx.classEnrollment.create({
        data: {
          student_id,
          course_class_id,
        },
      });

      await tx.courseClass.update({
        where: { id: course_class_id },
        data: {
          current_students: {
            increment: 1,
          },
        },
      });

      // Auto-calculate tuition fee for this semester
      await this.recalculateTuitionFee(tx, student_id, courseClass.semester_id);

      return enrollment;
    });
  }

  async createMany(createClassEnrollmentDtos: CreateClassEnrollmentDto[]) {
    const results: any[] = [];
    for (const dto of createClassEnrollmentDtos) {
      try {
        const result = await this.create(dto);
        results.push({ success: true, data: result });
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          student_id: dto.student_id,
          course_class_id: dto.course_class_id,
        });
      }
    }
    return {
      total: createClassEnrollmentDtos.length,
      success_count: results.filter(r => r.success).length,
      error_count: results.filter(r => !r.success).length,
      results
    };
  }

  findAll() {
    return this.prisma.classEnrollment.findMany({
      include: {
        student: {
          select: { student_code: true, full_name: true, class_name: true },
        },
        course_class: {
          include: {
            subject: {
              select: { subject_code: true, subject_name: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: bigint) {
    const enrollment = await this.prisma.classEnrollment.findUnique({
      where: { id },
      include: {
        student: true,
        course_class: true,
      },
    });
    if (!enrollment) {
      throw new NotFoundException(`Không tìm thấy đăng ký học phần với ID ${id}`);
    }
    return enrollment;
  }

  async update(id: bigint, updateClassEnrollmentDto: UpdateClassEnrollmentDto) {
    await this.findOne(id);
    const data: any = {};
    if (updateClassEnrollmentDto.student_id) data.student_id = BigInt(updateClassEnrollmentDto.student_id);
    if (updateClassEnrollmentDto.course_class_id) data.course_class_id = BigInt(updateClassEnrollmentDto.course_class_id);

    return this.prisma.classEnrollment.update({
      where: { id },
      data,
    });
  }

  async remove(id: bigint) {
    const enrollment = await this.prisma.classEnrollment.findUnique({
      where: { id },
      include: {
        course_class: { select: { semester_id: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Không tìm thấy đăng ký học phần với ID ${id}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.classEnrollment.delete({
        where: { id },
      });

      await tx.courseClass.update({
        where: { id: enrollment.course_class_id },
        data: {
          current_students: {
            decrement: 1,
          },
        },
      });

      // Recalculate tuition fee after removing enrollment
      await this.recalculateTuitionFee(tx, enrollment.student_id, enrollment.course_class.semester_id);

      return deleted;
    });
  }

  /**
   * Tính lại học phí cho sinh viên trong 1 kỳ
   * Gọi trong transaction sau khi đăng ký/hủy môn
   */
  private async recalculateTuitionFee(tx: any, studentId: bigint, semesterId: bigint) {
    // 1. Lấy tất cả enrollments của SV trong kỳ này
    const enrollments = await tx.classEnrollment.findMany({
      where: {
        student_id: studentId,
        course_class: { semester_id: semesterId },
      },
      include: {
        course_class: {
          include: {
            subject: { select: { credits: true } },
          },
        },
      },
    });

    // 2. Tính tổng tín chỉ
    const totalCredits = enrollments.reduce(
      (sum: number, e: any) => sum + e.course_class.subject.credits,
      0,
    );

    // 3. Lấy đơn giá tín chỉ của kỳ
    const semester = await tx.semester.findUnique({
      where: { id: semesterId },
    });

    if (!semester) return;

    const tuitionPerCredit = Number(semester.tuition_per_credit);
    const totalAmount = totalCredits * tuitionPerCredit;

    // 4. Nếu không còn môn nào → xóa TuitionFee (nếu chưa thanh toán)
    if (totalCredits === 0) {
      await tx.tuitionFee.deleteMany({
        where: {
          student_id: studentId,
          semester_id: semesterId,
          status: 'UNPAID',
        },
      });
      return;
    }

    // 5. Upsert TuitionFee
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    // Kiểm tra tuitionFee đã tồn tại chưa
    const existingFee = await tx.tuitionFee.findUnique({
      where: {
        student_id_semester_id: {
          student_id: studentId,
          semester_id: semesterId,
        },
      },
    });

    if (existingFee) {
      // Nếu đã thanh toán rồi thì không update
      if (existingFee.status === 'PAID') return;

      const discountAmount = Number(existingFee.discount_amount);
      await tx.tuitionFee.update({
        where: { id: existingFee.id },
        data: {
          total_amount: totalAmount,
          final_amount: totalAmount - discountAmount,
        },
      });
    } else {
      await tx.tuitionFee.create({
        data: {
          student_id: studentId,
          semester_id: semesterId,
          total_amount: totalAmount,
          discount_amount: 0,
          final_amount: totalAmount,
          deadline,
        },
      });
    }
  }
}
