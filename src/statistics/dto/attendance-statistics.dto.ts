import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttendanceRateResponseDto {
  @ApiProperty({
    description: 'Tên thể loại',
    example: 'Chuyên cên tốt',
    type: String,
  })
  name!: string;

  @ApiProperty({
    description: 'Số lượng sinh viên',
    example: 45,
    type: Number,
  })
  count!: number;

  @ApiProperty({
    description: 'Tỷ lệ phần trăm',
    example: 75.5,
    type: Number,
  })
  percentage!: number;

  @ApiProperty({
    description: 'Màu sắc cho biểu đồ',
    example: '#4CAF50',
    type: String,
  })
  color!: string;
}

export class StudentAtRiskDto {
  @ApiProperty({
    description: 'ID sinh viên',
    example: '1',
    type: String,
  })
  id!: string;

  @ApiProperty({
    description: 'Mã sinh viên',
    example: 'SV20210001',
    type: String,
  })
  studentCode!: string;

  @ApiProperty({
    description: 'Họ tên sinh viên',
    example: 'Nguyễn Văn A',
    type: String,
  })
  fullName!: string;

  @ApiProperty({
    description: 'Email sinh viên',
    example: 'student@example.com',
    type: String,
  })
  email!: string;

  @ApiProperty({
    description: 'Tên lớp (khoá)',
    example: 'AT1A',
    type: String,
  })
  className!: string;

  @ApiProperty({
    description: 'Tên lớp học phần',
    example: 'Toán Cao Cấp - Lớp 01',
    type: String,
  })
  courseClassName!: string;

  @ApiProperty({
    description: 'Tỷ lệ chuyên cần (%)',
    example: 55.5,
    type: Number,
  })
  attendanceRate!: number;

  @ApiProperty({
    description: 'Số buổi học tổng cộng',
    example: 20,
    type: Number,
  })
  totalSessions!: number;

  @ApiProperty({
    description: 'Số buổi có mặt',
    example: 11,
    type: Number,
  })
  presentSessions!: number;

  @ApiProperty({
    description: 'Số buổi vắng',
    example: 9,
    type: Number,
  })
  absentSessions!: number;

  @ApiProperty({
    description: 'Mức độ rủi ro (WARNING: cảnh báo, CRITICAL: nguy hiểm)',
    example: 'CRITICAL',
    enum: ['WARNING', 'CRITICAL'],
    type: String,
  })
  riskLevel!: 'WARNING' | 'CRITICAL';

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Cảnh báo: Chuyên cần giảm mạnh',
    type: String,
  })
  notes?: string;
}

export class AttendanceStatisticsResponseDto {
  @ApiProperty({
    description: 'Tổng quan thống kê',
    example: {
      totalStudents: 60,
      goodAttendance: 45,
      warningAttendance: 12,
      criticalAttendance: 3,
      averageAttendanceRate: 82.5,
    },
  })
  summary!: {
    totalStudents: number;
    goodAttendance: number;
    warningAttendance: number;
    criticalAttendance: number;
    averageAttendanceRate: number;
  };

  @ApiProperty({
    description: 'Dữ liệu tỷ lệ cho biểu đồ',
    type: [AttendanceRateResponseDto],
    example: [
      {
        name: 'Chuyên cên tốt',
        count: 45,
        percentage: 75,
        color: '#4CAF50',
      },
      {
        name: 'Cảnh báo',
        count: 12,
        percentage: 20,
        color: '#FF9800',
      },
      {
        name: 'Nguy hiểm',
        count: 3,
        percentage: 5,
        color: '#F44336',
      },
    ],
  })
  attendanceRates!: AttendanceRateResponseDto[];

  @ApiProperty({
    description: 'Danh sách sinh viên có nguy cơ',
    type: [StudentAtRiskDto],
  })
  studentsAtRisk!: StudentAtRiskDto[];

  @ApiProperty({
    description: 'Tổng số sinh viên có nguy cơ',
    example: 15,
    type: Number,
  })
  totalAtRisk!: number;

  @ApiPropertyOptional({
    description: 'Thông tin phân trang',
    example: {
      page: 1,
      limit: 20,
      total: 15,
      totalPages: 1,
    },
  })
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({
    description: 'Thời gian thống kê',
    example: '2026-04-13',
    type: String,
  })
  statisticsDate!: string;

  @ApiPropertyOptional({
    description: 'Khoảng thời gian thống kê',
    example: {
      from: '2026-01-01',
      to: '2026-04-13',
    },
  })
  dateRange?: {
    from: string;
    to: string;
  };
}
