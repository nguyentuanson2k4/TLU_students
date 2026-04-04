import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateGradeDto, UpdateGradeDto } from './dto/grade.dto';

@ApiTags('Grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Tạo/nhập điểm cho sinh viên (Admin, Lecturer)' })
  create(@Body() createGradeDto: CreateGradeDto) {
    return this.gradesService.create(createGradeDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy tất cả điểm (Admin)' })
  findAll() {
    return this.gradesService.findAll();
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Sinh viên xem điểm của mình' })
  findMyGrades(@Request() req) {
    return this.gradesService.findMyGrades(req.user.id);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy điểm theo sinh viên (Admin, Lecturer)' })
  findByStudent(@Param('studentId') studentId: string) {
    return this.gradesService.findByStudent(studentId);
  }

  @Get('course-class/:courseClassId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy bảng điểm lớp học phần (Admin, Lecturer)' })
  findByCourseClass(@Param('courseClassId') courseClassId: string) {
    return this.gradesService.findByCourseClass(courseClassId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy chi tiết điểm theo ID (Admin, Lecturer)' })
  findById(@Param('id') id: string) {
    return this.gradesService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Cập nhật điểm (Admin, Lecturer)' })
  update(@Param('id') id: string, @Body() updateGradeDto: UpdateGradeDto) {
    return this.gradesService.update(id, updateGradeDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa điểm (Admin)' })
  remove(@Param('id') id: string) {
    return this.gradesService.remove(id);
  }
}
