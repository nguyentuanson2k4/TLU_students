import { IsString, IsNotEmpty, MaxLength, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateSemesterDto {
  @ApiProperty({ description: 'Tên học kỳ (VD: Học kỳ 1, Học kỳ 2, Học kỳ hè', example: 'Học kỳ 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  semester_name: string;

  @ApiProperty({ description: 'Năm học (VD: 2023-2024)', example: '2023-2024' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academic_year: string;

  @ApiProperty({ description: 'Học phí cho mỗi tín chỉ (VNĐ)', example: 450000, required: false })
  @IsOptional()
  @IsNumber()
  tuition_per_credit?: number;
}

export class UpdateSemesterDto extends PartialType(CreateSemesterDto) {}
