import {
  IsOptional,
  IsDateString,
  IsString,
  IsInt,
  IsNotEmpty,
  IsBoolean,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class GenerateReportQueryDto {
  @ApiPropertyOptional({
    description: 'ID học kỳ (optional)',
    example: '1',
    type: String,
  })
  @IsOptional()
  @IsString()
  semesterId?: string;

  @ApiPropertyOptional({
    description: 'ID khoa/phòng (optional)',
    example: '2',
    type: String,
  })
  @IsOptional()
  @IsString()
  facultyId?: string;

  @ApiPropertyOptional({
    description: 'ID lớp học phần (optional)',
    example: '5',
    type: String,
  })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (format: YYYY-MM-DD, optional)',
    example: '2026-01-01',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (format: YYYY-MM-DD, optional)',
    example: '2026-04-13',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Định dạng xuất (excel hoặc pdf)',
    example: ReportFormat.EXCEL,
    enum: ReportFormat,
    default: ReportFormat.EXCEL,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.EXCEL;

  @ApiPropertyOptional({
    description: 'Trang (pagination) - bắt đầu từ 1',
    example: 1,
    type: Number,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số kết quả mỗi trang (1-1000)',
    example: 100,
    type: Number,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiPropertyOptional({
    description: 'Tiêu đề báo cáo tùy chỉnh (optional)',
    example: 'Báo cáo Chuyên cần - Học kỳ II 2025-2026',
    type: String,
  })
  @IsOptional()
  @IsString()
  reportTitle?: string;
}

export class ExportAttendanceReportDto {
  @ApiProperty({
    description: 'ID học kỳ',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  semesterId: string;

  @ApiPropertyOptional({
    description: 'ID khoa (nếu muốn lọc báo cáo theo khoa)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString()
  facultyId?: string;

  @ApiPropertyOptional({
    description: 'ID lớp (nếu muốn lọc báo cáo theo lớp)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({
    enum: ReportFormat,
    description: 'Định dạng xuất báo cáo',
    example: 'excel',
  })
  @IsEnum(ReportFormat)
  @IsNotEmpty()
  format: ReportFormat;

  @ApiPropertyOptional({
    description: 'Có xuất danh sách sinh viên chi tiết hay không',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDetails?: boolean = true;
}
