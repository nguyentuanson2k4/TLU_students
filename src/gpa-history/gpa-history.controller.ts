import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GpaHistoryService } from './gpa-history.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateGpaHistoryDto, UpdateGpaHistoryDto } from './dto/gpa-history.dto';

@ApiTags('GPA History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gpa-history')
export class GpaHistoryController {
  constructor(private readonly gpaHistoryService: GpaHistoryService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo lịch sử GPA (Admin)' })
  create(@Body() createGpaHistoryDto: CreateGpaHistoryDto) {
    return this.gpaHistoryService.create(createGpaHistoryDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy tất cả lịch sử GPA (Admin)' })
  findAll() {
    return this.gpaHistoryService.findAll();
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Sinh viên xem lịch sử GPA của mình' })
  findMyGpaHistory(@Request() req) {
    return this.gpaHistoryService.findMyGpaHistory(req.user.id);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy lịch sử GPA theo sinh viên (Admin, Lecturer)' })
  findByStudent(@Param('studentId') studentId: string) {
    return this.gpaHistoryService.findByStudent(studentId);
  }

  @Get('semester/:semesterId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy lịch sử GPA theo học kỳ (Admin, Lecturer)' })
  findBySemester(@Param('semesterId') semesterId: string) {
    return this.gpaHistoryService.findBySemester(semesterId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy chi tiết GPA theo ID (Admin, Lecturer)' })
  findById(@Param('id') id: string) {
    return this.gpaHistoryService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật lịch sử GPA (Admin)' })
  update(@Param('id') id: string, @Body() updateGpaHistoryDto: UpdateGpaHistoryDto) {
    return this.gpaHistoryService.update(id, updateGpaHistoryDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa lịch sử GPA (Admin)' })
  remove(@Param('id') id: string) {
    return this.gpaHistoryService.remove(id);
  }
}
