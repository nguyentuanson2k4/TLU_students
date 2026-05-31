import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  UpdateAttendanceRecordDto,
} from './dto/attendance.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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

  // ===================== EXPORT =====================

  @Get('sessions/:id/export-excel')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Xuất danh sách điểm danh của buổi học ra file Excel (Dành cho: Giảng Viên)' })
  async exportSessionExcel(@Param('id') id: string, @Res({ passthrough: true }) res: any): Promise<StreamableFile> {
    const buffer = await this.attendanceService.exportSessionAttendanceExcel(BigInt(id));

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=diem-danh-buoi-${id}.xlsx`,
    });

    return new StreamableFile(buffer);
  }
}
