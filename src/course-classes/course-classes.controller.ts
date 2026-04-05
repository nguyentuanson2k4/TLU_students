import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CourseClassesService } from './course-classes.service';
import { CreateCourseClassDto, UpdateCourseClassDto } from './dto/course-class.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
