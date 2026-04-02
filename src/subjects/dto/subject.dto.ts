import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ description: 'Mã môn học (VD: INT123)', example: 'INT123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  subject_code: string;

  @ApiProperty({ description: 'Tên môn học', example: 'Lập trình Web' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject_name: string;

  @ApiProperty({ description: 'Số tín chỉ', example: 3 })
  @IsInt()
  @Min(1)
  credits: number;

  @ApiProperty({ description: 'Mô tả tóm tắt môn học', example: 'Môn học cơ sở...', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {}
