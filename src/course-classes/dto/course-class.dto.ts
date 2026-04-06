import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsOptional, IsDateString, Max } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateCourseClassDto {
  @ApiProperty({ description: 'ID môn học', type: Number })
  @IsNotEmpty()
  @IsInt()
  subject_id: number;

  @ApiProperty({ description: 'ID giảng viên', type: Number })
  @IsNotEmpty()
  @IsInt()
  lecturer_id: number;

  @ApiProperty({ description: 'ID học kỳ', type: Number })
  @IsNotEmpty()
  @IsInt()
  semester_id: number;


  @ApiProperty({ description: 'Năm học (VD: 2023-2024)', example: '2023-2024' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academic_year: string;

  @ApiProperty({ description: 'Phòng học', example: 'A1-203', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string;

  @ApiProperty({ description: 'Số lượng sinh viên tối đa', example: 60, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_students?: number;

  @ApiProperty({ description: 'Thứ trong tuần (2-8)', example: 2 })
  @IsInt()
  @Min(2)
  @Max(8)
  day_of_week: number;

  @ApiProperty({ description: 'Kíp học (VD: 1-3)', example: '1-3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lesson_slot: string;

  @ApiProperty({ description: 'Ngày bắt đầu (ISO Date)', example: '2023-09-05T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ description: 'Ngày kết thúc (ISO Date)', example: '2023-12-15T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;
}

export class UpdateCourseClassDto extends PartialType(CreateCourseClassDto) {}
