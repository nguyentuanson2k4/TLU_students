import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CreateCourseClassDto, UpdateCourseClassDto } from './dto/course-class.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';

@Injectable()
export class CourseClassesService {
  private readonly logger = new Logger(CourseClassesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

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

    const courseClass = await this.prisma.courseClass.create({
      data,
    });

    // Tự động sinh các buổi điểm danh
    try {
      const result = await this.attendanceService.generateSessionsForClass(courseClass.id);
      this.logger.log(
        `Auto-generated ${result.created} attendance sessions for course class ${courseClass.id}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to auto-generate sessions for course class ${courseClass.id}: ${error.message}`,
      );
    }

    return courseClass;
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

  /**
   * Sinh lại các buổi điểm danh cho lớp học phần.
   * Delegate sang AttendanceService.
   */
  async generateSessions(id: bigint, clearExisting = false) {
    await this.findOne(id); // Kiểm tra tồn tại
    return this.attendanceService.generateSessionsForClass(id, clearExisting);
  }
}
