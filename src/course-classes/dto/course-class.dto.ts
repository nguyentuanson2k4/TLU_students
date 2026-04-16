import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsOptional, IsDateString, Max, Matches, IsNumber } from 'class-validator';
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

  @ApiProperty({ description: 'Vĩ độ phòng học', example: 21.0071, required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ description: 'Kinh độ phòng học', example: 105.8239, required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ description: 'Bán kính tính theo mét cho phép điểm danh', example: 50, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  allowed_radius?: number;

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

  @ApiProperty({ description: 'Thời gian/Kíp học (VD: 7:00-9:00)', example: '7:00-9:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Thời gian học phải đúng định dạng hh:mm-hh:mm (VD: 7:00-9:00)',
  })
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
