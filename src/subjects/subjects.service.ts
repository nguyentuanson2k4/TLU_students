import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubjectDto: CreateSubjectDto) {
    const existing = await this.prisma.subject.findUnique({
      where: { subject_code: createSubjectDto.subject_code },
    });
    if (existing) {
      throw new ConflictException(`Môn học với mã ${createSubjectDto.subject_code} đã tồn tại`);
    }
    return this.prisma.subject.create({
      data: createSubjectDto,
    });
  }

  async createMany(createSubjectDtos: CreateSubjectDto[]) {
    return this.prisma.subject.createMany({
      data: createSubjectDtos,
      skipDuplicates: true,
    });
  }

  findAll() {
    return this.prisma.subject.findMany({
      orderBy: { subject_code: 'asc' }
    });
  }

  async findOne(id: bigint) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
    });
    if (!subject) {
      throw new NotFoundException(`Không tìm thấy môn học với ID ${id}`);
    }
    return subject;
  }

  async findByCode(subjectCode: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { subject_code: subjectCode },
    });
    if (!subject) {
      throw new NotFoundException(`Không tìm thấy môn học với mã ${subjectCode}`);
    }
    return subject;
  }

  async update(id: bigint, updateSubjectDto: UpdateSubjectDto) {
    await this.findOne(id); // Check exists
    if (updateSubjectDto.subject_code) {
      const existing = await this.prisma.subject.findUnique({
        where: { subject_code: updateSubjectDto.subject_code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Mã môn học ${updateSubjectDto.subject_code} đã được sử dụng`);
      }
    }
    return this.prisma.subject.update({
      where: { id },
      data: updateSubjectDto,
    });
  }

  async remove(id: bigint) {
    await this.findOne(id); // Check exists
    return this.prisma.subject.delete({
      where: { id },
    });
  }
}
