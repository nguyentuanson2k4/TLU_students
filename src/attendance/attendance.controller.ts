import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceRecordDto,
  UpdateAttendanceRecordDto,
  BulkCreateAttendanceDto,
} from './dto/attendance.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ===================== SESSION ENDPOINTS =====================


  @Get('sessions/me/active')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Lấy các buổi điểm danh trong ngày hôm nay của sinh viên (Dành cho: Sinh Viên)' })
  getActiveSessionsForStudent(@Req() req: any) {
    const userId = typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    return this.attendanceService.getActiveSessionsForStudent(userId);
  }

  @Get('sessions/course-class/:courseClassId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy danh sách buổi điểm danh theo lớp học phần (Dành cho: Giảng Viên)' })
  findSessionsByCourseClass(@Param('courseClassId') courseClassId: string) {
    return this.attendanceService.findSessionsByCourseClass(BigInt(courseClassId));
  }

  @Get('sessions/:id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy chi tiết buổi điểm danh (bao gồm danh sách điểm danh) (Dành cho: Giảng Viên)' })
  findOneSession(@Param('id') id: string) {
    return this.attendanceService.findOneSession(BigInt(id));
  }



  // ===================== RECORD ENDPOINTS =====================

  @Post('records')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Tạo bản ghi điểm danh thủ công cho 1 sinh viên (Dành cho: Giảng Viên)' })
  createRecord(@Body() dto: CreateAttendanceRecordDto) {
    return this.attendanceService.createRecord(dto);
  }

  @Post('records/bulk')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Điểm danh hàng loạt cho nhiều sinh viên (Dành cho: Giảng Viên)' })
  bulkCreateRecords(@Body() dto: BulkCreateAttendanceDto) {
    return this.attendanceService.bulkCreateRecords(dto);
  }



  @Get('records/student/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  @ApiOperation({ summary: 'Lấy lịch sử điểm danh của một sinh viên (Dành cho: Chung)' })
  findRecordsByStudent(@Param('studentId') studentId: string) {
    return this.attendanceService.findRecordsByStudent(BigInt(studentId));
  }



  @Patch('records/:id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Cập nhật/Sửa trạng thái điểm danh thủ công (Dành cho: Giảng Viên)' })
  updateRecord(@Param('id') id: string, @Body() dto: UpdateAttendanceRecordDto) {
    return this.attendanceService.updateRecord(BigInt(id), dto);
  }



}
