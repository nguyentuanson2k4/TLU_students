import { ApiProperty } from '@nestjs/swagger';

export class ReportFileResponseDto {
  @ApiProperty({
    description: 'Tên file báo cáo',
    example: 'report_attendance_2026_04_13.xlsx',
    type: String,
  })
  fileName: string;

  @ApiProperty({
    description: 'MIME type của file',
    example:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    type: String,
  })
  mimeType: string;
}

export class ReportGenerationResponseDto {
  @ApiProperty({
    description: 'Trạng thái tạo báo cáo',
    example: 'success',
    type: String,
  })
  status!: string;

  @ApiProperty({
    description: 'Dung lượng file (bytes)',
    example: 2048000,
    type: Number,
  })
  fileSize!: number;

  @ApiProperty({
    description: 'Tên file được tạo',
    example: 'report_attendance_2026_04_13.xlsx',
    type: String,
  })
  fileName!: string;

  @ApiProperty({
    description: 'Download URL (tạm thời, hết hạn sau 1 tiếng)',
    example: '/api/reports/download/report_attendance_2026_04_13.xlsx',
    type: String,
  })
  downloadUrl!: string;

  @ApiProperty({
    description: 'Thời gian tạo báo cáo',
    example: '2026-04-13T10:30:45.123Z',
    type: String,
  })
  generatedAt!: string;

  @ApiProperty({
    description: 'Số lượng bản ghi được xuất',
    example: 250,
    type: Number,
  })
  recordCount!: number;

  @ApiProperty({
    description: 'Định dạng file',
    example: 'xlsx',
    type: String,
  })
  format!: string;

  @ApiProperty({
    description: 'Ghi chú thêm (tùy chọn)',
    example: 'Báo cáo chứa 250 sinh viên từ học kỳ II 2025-2026',
    type: String,
  })
  notes?: string;
}

export class ReportSummaryDto {
  @ApiProperty({
    description: 'Tổng số báo cáo đã tạo trong tháng',
    example: 15,
    type: Number,
  })
  totalReportsThisMonth!: number;

  @ApiProperty({
    description: 'Định dạng file phổ biến nhất',
    example: 'xlsx',
    type: String,
  })
  mostCommonFormat!: string;

  @ApiProperty({
    description: 'Dung lượng báo cáo trung bình (bytes)',
    example: 1024000,
    type: Number,
  })
  averageFileSize!: number;

  @ApiProperty({
    description: 'Thời gian tạo báo cáo lần cuối',
    example: '2026-04-13T10:30:45.123Z',
    type: String,
  })
  lastGeneratedAt?: string;
}
