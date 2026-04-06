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

      return enrollment;
    });
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
    const enrollment = await this.findOne(id);
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

      return deleted;
    });
  }
}
