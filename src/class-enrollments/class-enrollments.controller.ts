import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ClassEnrollmentsService } from './class-enrollments.service';
import { CreateClassEnrollmentDto, UpdateClassEnrollmentDto } from './dto/class-enrollment.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Class Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('class-enrollments')
export class ClassEnrollmentsController {
  constructor(private readonly classEnrollmentsService: ClassEnrollmentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Đăng ký lớp học phần cho sinh viên (Admin)' })
  create(@Body() createClassEnrollmentDto: CreateClassEnrollmentDto) {
    return this.classEnrollmentsService.create(createClassEnrollmentDto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Đăng ký nhiều lớp học phần (Admin)' })
  createMany(@Body() createClassEnrollmentDtos: CreateClassEnrollmentDto[]) {
    return this.classEnrollmentsService.createMany(createClassEnrollmentDtos);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy danh sách tất cả đăng ký học phần' })
  findAll() {
    return this.classEnrollmentsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  @ApiOperation({ summary: 'Lấy thông tin đăng ký học phần theo ID' })
  findOne(@Param('id') id: string) {
    return this.classEnrollmentsService.findOne(BigInt(id));
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật đăng ký học phần (Admin)' })
  update(@Param('id') id: string, @Body() updateClassEnrollmentDto: UpdateClassEnrollmentDto) {
    return this.classEnrollmentsService.update(BigInt(id), updateClassEnrollmentDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa đăng ký học phần (Admin)' })
  remove(@Param('id') id: string) {
    return this.classEnrollmentsService.remove(BigInt(id));
  }
}
