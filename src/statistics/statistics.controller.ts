import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { GetAttendanceStatsDto } from './dto/statistics-query.dto';
import {
  AttendanceStatisticsResponseDto,
  AttendanceRateResponseDto,
  StudentAtRiskDto,
} from './dto/attendance-statistics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Statistics - Thống Kê Chuyên Cần')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('attendance-overview')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Lấy thống kê tổng quan chuyên cần (tỷ lệ theo phân loại)',
    description:
      'Trả về tổng số sinh viên, phân loại theo tỷ lệ chuyên cần, và tỷ lệ trung bình',
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
  @ApiResponse({
    status: 200,
    description: 'Thống kê tổng quan chuyên cần',
    type: AttendanceStatisticsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu input không hợp lệ (ngày không đúng format)',
  })
  @ApiResponse({
    status: 401,
    description: 'Không được xác thực (missing JWT token)',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập (không phải ADMIN/LECTURER)',
  })
  async getAttendanceOverview(
    @Query() query: GetAttendanceStatsDto,
  ): Promise<AttendanceStatisticsResponseDto> {
    return this.statisticsService.getOverallAttendanceStats(query);
  }

  @Get('attendance-chart')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Lấy dữ liệu biểu đồ chuyên cần (Chart.js format)',
    description:
      'Trả về dữ liệu sẵn sàng để vẽ chart (labels + datasets với colors)',
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
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu biểu đồ (Chart.js format)',
    example: {
      labels: ['Chuyên cên tốt', 'Cảnh báo', 'Nguy hiểm'],
      datasets: [
        {
          label: 'Số sinh viên',
          data: [45, 12, 3],
          backgroundColor: ['#4CAF50', '#FF9800', '#F44336'],
        },
      ],
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
  async getAttendanceChartData(@Query() query: GetAttendanceStatsDto): Promise<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string[];
    }>;
  }> {
    return this.statisticsService.getAttendanceChartData(query);
  }

  @Get('students-at-risk')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Lấy danh sách sinh viên có nguy cơ cấm thi',
    description:
      'Trả về danh sách sinh viên có tỷ lệ chuyên cần < 75% hoặc có warning severity cao',
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
    name: 'page',
    description: 'Trang (bắt đầu từ 1, default 1)',
    required: false,
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số kết quả mỗi trang (1-100, default 20)',
    required: false,
    example: 20,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách sinh viên có nguy cơ',
    type: AttendanceStatisticsResponseDto,
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
  async getStudentsAtRisk(
    @Query() query: GetAttendanceStatsDto,
  ): Promise<AttendanceStatisticsResponseDto> {
    return this.statisticsService.getStudentsAtRisk(query);
  }
}
