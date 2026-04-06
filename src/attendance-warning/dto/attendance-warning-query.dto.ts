import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for querying attendance warnings with filters and pagination
 */
export class QueryAttendanceWarningDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  severity?: 'Low' | 'Medium' | 'High';

  @IsOptional()
  @IsString()
  student_code?: string;

  @IsOptional()
  @Type(() => Number)
  class_id?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_resolved?: boolean;
}

/**
 * DTO for resolving a warning
 */
export class ResolveWarningDto {
  @IsOptional()
  @IsString()
  resolution_note?: string;
}

/**
 * DTO for attendance warning response
 */
export class AttendanceWarningResponseDto {
  id?: bigint;
  user_id?: bigint;
  student_code?: string;
  student_name?: string;
  category?: string;
  severity?: string;
  content?: string;
  is_resolved?: boolean;
  created_at?: Date;
  updated_at?: Date;
  resolution_note?: string;
}
