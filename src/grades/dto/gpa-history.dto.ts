import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateGpaHistoryDto {
  @ApiProperty({ description: 'ID của sinh viên', example: '1' })
  @IsNotEmpty()
  @IsString()
  student_id: string;

  @ApiProperty({ description: 'ID của học kỳ', example: '1' })
  @IsNotEmpty()
  @IsString()
  semester_id: string;

  @ApiPropertyOptional({ description: 'GPA học kỳ (0-4.00)', example: 3.25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa_semester?: number;

  @ApiPropertyOptional({ description: 'GPA tích lũy (0-4.00)', example: 3.10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa_cumulative?: number;
}

export class UpdateGpaHistoryDto extends PartialType(CreateGpaHistoryDto) {}
