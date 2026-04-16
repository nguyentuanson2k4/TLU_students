import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CourseClassesService } from './course-classes.service';
import { CreateCourseClassDto, UpdateCourseClassDto } from './dto/course-class.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Course Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('course-classes')
export class CourseClassesController {
  constructor(private readonly courseClassesService: CourseClassesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo lớp học phần mới (Admin)' })
  create(@Body() createCourseClassDto: CreateCourseClassDto) {
    return this.courseClassesService.create(createCourseClassDto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo nhiều lớp học phần mới (Admin)' })
  createMany(@Body() createCourseClassDtos: CreateCourseClassDto[]) {
    return this.courseClassesService.createMany(createCourseClassDtos);
  }

  @Post(':id/generate-sessions')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Tự động sinh các buổi điểm danh cho lớp học phần',
    description: 'Dựa trên day_of_week, lesson_slot, start_date, end_date để tạo tất cả các buổi điểm danh.',
  })
  @ApiQuery({
    name: 'clearExisting',
    required: false,
    type: Boolean,
    description: 'Xóa các buổi cũ chưa có record điểm danh trước khi tạo mới (mặc định: false)',
  })
  generateSessions(
    @Param('id') id: string,
    @Query('clearExisting') clearExisting?: string,
  ) {
    return this.courseClassesService.generateSessions(
      BigInt(id),
      clearExisting === 'true',
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  @ApiOperation({ summary: 'Lấy danh sách tất cả lớp học phần' })
  findAll() {
    return this.courseClassesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  @ApiOperation({ summary: 'Lấy thông tin lớp học phần theo ID' })
  findOne(@Param('id') id: string) {
    return this.courseClassesService.findOne(BigInt(id));
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin lớp học phần (Admin)' })
  update(@Param('id') id: string, @Body() updateCourseClassDto: UpdateCourseClassDto) {
    return this.courseClassesService.update(BigInt(id), updateCourseClassDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa lớp học phần (Admin)' })
  remove(@Param('id') id: string) {
    return this.courseClassesService.remove(BigInt(id));
  }
}
