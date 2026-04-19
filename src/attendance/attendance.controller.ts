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
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
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

  @Post('sessions')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Tạo buổi điểm danh mới' })
  createSession(@Body() dto: CreateAttendanceSessionDto) {
    return this.attendanceService.createSession(dto);
  }

  @Get('sessions')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy danh sách tất cả buổi điểm danh' })
  findAllSessions() {
    return this.attendanceService.findAllSessions();
  }

  @Get('sessions/me/active')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Lấy các buổi điểm danh trong ngày hôm nay của sinh viên' })
  getActiveSessionsForStudent(@Req() req: any) {
    const userId = typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    return this.attendanceService.getActiveSessionsForStudent(userId);
  }

  @Get('sessions/course-class/:courseClassId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy danh sách buổi điểm danh theo lớp học phần' })
  findSessionsByCourseClass(@Param('courseClassId') courseClassId: string) {
    return this.attendanceService.findSessionsByCourseClass(BigInt(courseClassId));
  }

  @Get('sessions/:id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy chi tiết buổi điểm danh (bao gồm danh sách điểm danh)' })
  findOneSession(@Param('id') id: string) {
    return this.attendanceService.findOneSession(BigInt(id));
  }

  @Patch('sessions/:id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Cập nhật buổi điểm danh' })
  updateSession(@Param('id') id: string, @Body() dto: UpdateAttendanceSessionDto) {
    return this.attendanceService.updateSession(BigInt(id), dto);
  }

  @Delete('sessions/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa buổi điểm danh (Admin)' })
  removeSession(@Param('id') id: string) {
    return this.attendanceService.removeSession(BigInt(id));
  }

  // ===================== RECORD ENDPOINTS =====================

  @Post('records')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Tạo bản ghi điểm danh cho 1 sinh viên' })
  createRecord(@Body() dto: CreateAttendanceRecordDto) {
    return this.attendanceService.createRecord(dto);
  }

  @Post('records/bulk')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Điểm danh hàng loạt cho nhiều sinh viên' })
  bulkCreateRecords(@Body() dto: BulkCreateAttendanceDto) {
    return this.attendanceService.bulkCreateRecords(dto);
  }

  @Get('records/session/:sessionId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy danh sách điểm danh theo buổi' })
  findRecordsBySession(@Param('sessionId') sessionId: string) {
    return this.attendanceService.findRecordsBySession(BigInt(sessionId));
  }

  @Get('records/student/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  @ApiOperation({ summary: 'Lấy lịch sử điểm danh của sinh viên' })
  findRecordsByStudent(@Param('studentId') studentId: string) {
    return this.attendanceService.findRecordsByStudent(BigInt(studentId));
  }

  @Get('records/:id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy chi tiết bản ghi điểm danh' })
  findOneRecord(@Param('id') id: string) {
    return this.attendanceService.findOneRecord(BigInt(id));
  }

  @Patch('records/:id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Cập nhật bản ghi điểm danh' })
  updateRecord(@Param('id') id: string, @Body() dto: UpdateAttendanceRecordDto) {
    return this.attendanceService.updateRecord(BigInt(id), dto);
  }

  @Delete('records/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa bản ghi điểm danh (Admin)' })
  removeRecord(@Param('id') id: string) {
    return this.attendanceService.removeRecord(BigInt(id));
  }

  // ===================== STATISTICS ENDPOINTS =====================

  @Get('stats/session/:sessionId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Thống kê điểm danh theo buổi' })
  getStatsBySession(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getAttendanceStatsBySession(BigInt(sessionId));
  }

  @Get('stats/student/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  @ApiOperation({ summary: 'Thống kê điểm danh của sinh viên' })
  @ApiQuery({ name: 'courseClassId', required: false, description: 'Lọc theo lớp học phần' })
  getStudentStats(
    @Param('studentId') studentId: string,
    @Query('courseClassId') courseClassId?: string,
  ) {
    return this.attendanceService.getStudentAttendanceStats(
      BigInt(studentId),
      courseClassId ? BigInt(courseClassId) : undefined,
    );
  }
}
