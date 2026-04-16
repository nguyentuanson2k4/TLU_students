import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query DTO for students to retrieve their own service requests
 */
export class QueryStudentServiceRequestDto {
  @ApiPropertyOptional({
    description: 'Số trang (mặc định: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng items mỗi trang (mặc định: 10, tối đa: 100)',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Status must be a number' })
  status?: number;
}

/**
 * Query DTO for admin to retrieve all service requests with filtering
 */
export class QueryAdminServiceRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Status must be a number' })
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Document type ID must be a number' })
  document_type_id?: number;

  @IsOptional()
  student_code?: string;

  @IsOptional()
  full_name?: string;
}
