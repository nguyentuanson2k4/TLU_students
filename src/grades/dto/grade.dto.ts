import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateGradeDto {
  @ApiProperty({ description: 'ID của sinh viên', example: '1' })
  @IsNotEmpty()
  @IsString()
  student_id: string;

  @ApiProperty({ description: 'ID của lớp học phần', example: '1' })
  @IsNotEmpty()
  @IsString()
  course_class_id: string;

  @ApiProperty({ description: 'ID của đăng ký lớp', example: '1' })
  @IsNotEmpty()
  @IsString()
  enrollment_id: string;

  @ApiPropertyOptional({ description: 'Điểm chuyên cần (0-10)', example: 8.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score_attendance?: number;

  @ApiPropertyOptional({ description: 'Điểm quá trình (0-10)', example: 7.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score_process?: number;

  @ApiPropertyOptional({ description: 'Điểm cuối kỳ (0-10)', example: 6.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score_final?: number;
}

export class UpdateGradeDto extends PartialType(CreateGradeDto) {}
