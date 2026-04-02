import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateSemesterDto, UpdateSemesterDto } from './dto/semester.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSemesterDto: CreateSemesterDto) {
    const existing = await this.prisma.semester.findFirst({
      where: {
        semester_name: createSemesterDto.semester_name,
        academic_year: createSemesterDto.academic_year,
      },
    });
    if (existing) {
      throw new ConflictException('Học kỳ này đã tồn tại trong năm học này');
    }
    return this.prisma.semester.create({
      data: createSemesterDto,
    });
  }

  findAll() {
    return this.prisma.semester.findMany({
      orderBy: [
        { academic_year: 'desc' },
        { semester_name: 'desc' }
      ]
    });
  }

  async findOne(id: bigint) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
    });
    if (!semester) {
      throw new NotFoundException(`Không tìm thấy học kỳ với ID ${id}`);
    }
    return semester;
  }

  async update(id: bigint, updateSemesterDto: UpdateSemesterDto) {
    await this.findOne(id); // Check exists
    return this.prisma.semester.update({
      where: { id },
      data: updateSemesterDto,
    });
  }

  async remove(id: bigint) {
    await this.findOne(id); // Check exists
    return this.prisma.semester.delete({
      where: { id },
    });
  }
}
