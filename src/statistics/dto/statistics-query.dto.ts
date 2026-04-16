import {
  IsOptional,
  IsDateString,
  IsNumberString,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetAttendanceStatsDto {
  @ApiPropertyOptional({
    description: 'ID học kỳ',
    example: '1',
    type: String,
  })
  @IsOptional()
  @IsString()
  semesterId?: string;

  @ApiPropertyOptional({
    description: 'ID khoa/phòng',
    example: '2',
    type: String,
  })
  @IsOptional()
  @IsString()
  facultyId?: string;

  @ApiPropertyOptional({
    description: 'ID lớp học phần',
    example: '5',
    type: String,
  })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (format: YYYY-MM-DD)',
    example: '2026-01-01',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (format: YYYY-MM-DD)',
    example: '2026-04-13',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

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
    description: 'Số kết quả mỗi trang (1-100)',
    example: 20,
    type: Number,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
