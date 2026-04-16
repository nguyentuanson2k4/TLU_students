import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Res,
  BadRequestException,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  GenerateReportQueryDto,
  ExportAttendanceReportDto,
  ReportFormat,
} from './dto/report-query.dto';
import { ReportGenerationResponseDto } from './dto/report-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reports - Xuất Báo Cáo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate-comprehensive')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Tạo báo cáo tổng hợp chuyên cần cuối kỳ',
    description: 'Xuất báo cáo chuyên cần tổng hợp theo các điều kiện lọc',
  })
  @ApiQuery({
    name: 'semesterId',
    description: 'ID học kỳ (optional)',
    required: false,
    example: '1',
    type: String,
  })
  @ApiQuery({
    name: 'facultyId',
    description: 'ID khoa/phòng (optional)',
    required: false,
    example: '2',
    type: String,
  })
  @ApiQuery({
    name: 'classId',
    description: 'ID lớp học phần (optional)',
    required: false,
    example: '5',
    type: String,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Ngày bắt đầu (format: YYYY-MM-DD, optional)',
    required: false,
    example: '2026-01-01',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Ngày kết thúc (format: YYYY-MM-DD, optional)',
    required: false,
    example: '2026-04-13',
    type: String,
  })
  @ApiQuery({
    name: 'format',
    description: 'Định dạng xuất (excel)',
    required: false,
    example: 'excel',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang (pagination)',
    required: false,
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng sinh viên mỗi trang (1-1000)',
    required: false,
    example: 100,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Báo cáo được tạo thành công',
    type: ReportGenerationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu input không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Không được xác thực',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập',
  })
  async generateComprehensiveReport(
    @Query() query: GenerateReportQueryDto,
  ): Promise<ReportGenerationResponseDto> {
    return this.reportsService.generateComprehensiveReport(query);
  }

  @Post('export')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiConsumes('application/json')
  @ApiOperation({
    summary: 'Xuất báo cáo chuyên cần (Excel/PDF)',
    description:
      'Xuất báo cáo chuyên cần với 3 sheets: tổng quan, tỷ lệ chuyên cần, danh sách sinh viên nguy cơ',
  })
  @ApiResponse({
    status: 200,
    description: 'File báo cáo được xuất thành công',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu input không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Không được xác thực',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập',
  })
  async exportAttendanceReportNew(
    @Body() query: ExportAttendanceReportDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Gọi service để lấy buffer file
      const buffer = await this.reportsService.exportAttendanceReport(query);

      // Tạo filename: bao-cao-chuyen-can-[semesterId]-[date].xlsx
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `bao-cao-chuyen-can-${query.semesterId}-${date}.xlsx`;

      // Set headers cho file Excel
      const mimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );
      res.setHeader('Content-Length', buffer.length);

      // Gửi file stream
      res.send(buffer);
    } catch (error) {
      throw new BadRequestException(`Lỗi khi xuất báo cáo: ${error.message}`);
    }
  }

  @Get('download/:fileName')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Tải xuống file báo cáo',
    description: 'Tải xuống file báo cáo đã tạo',
  })
  @ApiResponse({
    status: 200,
    description: 'File được tải thành công',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File không tồn tại',
  })
  async downloadReport(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!fileName || fileName.includes('..')) {
      throw new BadRequestException('Tên file không hợp lệ');
    }

    try {
      const buffer = await this.reportsService.downloadReport(fileName);

      const mimeType = fileName.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('cleanup-old')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Xóa báo cáo cũ (chỉ ADMIN)',
    description:
      'Xóa các file báo cáo cũ hơn 7 ngày (chỉ dành cho quản trị viên)',
  })
  @ApiQuery({
    name: 'daysOld',
    description: 'Xóa báo cáo cũ hơn N ngày (default: 7)',
    required: false,
    example: 7,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    schema: {
      example: { message: 'Đã xóa 5 báo cáo cũ', deletedCount: 5 },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ ADMIN có quyền',
  })
  async cleanupOldReports(
    @Query('daysOld') daysOld?: number,
  ): Promise<{ message: string; deletedCount: number }> {
    const deletedCount = await this.reportsService.cleanupOldReports(
      daysOld || 7,
    );
    return {
      message: `Đã xóa ${deletedCount} báo cáo cũ`,
      deletedCount,
    };
  }
}
