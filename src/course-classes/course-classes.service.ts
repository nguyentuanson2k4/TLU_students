import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourseClassDto, UpdateCourseClassDto } from './dto/course-class.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCourseClassDto: CreateCourseClassDto) {
    const data = {
      ...createCourseClassDto,
      subject_id: BigInt(createCourseClassDto.subject_id),
      lecturer_id: BigInt(createCourseClassDto.lecturer_id),
      semester_id: BigInt(createCourseClassDto.semester_id),
      start_date: new Date(createCourseClassDto.start_date),
      end_date: new Date(createCourseClassDto.end_date),
      current_students: 0,
    };

    return this.prisma.courseClass.create({
      data,
    });
  }

  async createMany(createCourseClassDtos: CreateCourseClassDto[]) {
    const data = createCourseClassDtos.map((dto) => ({
      ...dto,
      subject_id: BigInt(dto.subject_id),
      lecturer_id: BigInt(dto.lecturer_id),
      semester_id: BigInt(dto.semester_id),
      start_date: new Date(dto.start_date),
      end_date: new Date(dto.end_date),
      current_students: 0,
    }));

    return this.prisma.courseClass.createMany({
      data,
      skipDuplicates: true,
    });
  }

  findAll() {
    return this.prisma.courseClass.findMany({
      include: {
        subject: true,
        lecturer: {
          include: {
            user: {
              select: { username: true }
            }
          }
        },
        semester: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id },
      include: {
        subject: true,
        lecturer: true,
        semester: true,
      },
    });
    if (!courseClass) {
      throw new NotFoundException(`Không tìm thấy lớp học phần với ID ${id}`);
    }
    return courseClass;
  }

  async update(id: bigint, updateCourseClassDto: UpdateCourseClassDto) {
    await this.findOne(id); // Kiểm tra tồn tại

    const data: any = { ...updateCourseClassDto };

    if (updateCourseClassDto.subject_id) data.subject_id = BigInt(updateCourseClassDto.subject_id);
    if (updateCourseClassDto.lecturer_id) data.lecturer_id = BigInt(updateCourseClassDto.lecturer_id);
    if (updateCourseClassDto.semester_id) data.semester_id = BigInt(updateCourseClassDto.semester_id);
    if (updateCourseClassDto.start_date) data.start_date = new Date(updateCourseClassDto.start_date);
    if (updateCourseClassDto.end_date) data.end_date = new Date(updateCourseClassDto.end_date);

    return this.prisma.courseClass.update({
      where: { id },
      data,
    });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    return this.prisma.courseClass.delete({
      where: { id },
    });
  }
}
