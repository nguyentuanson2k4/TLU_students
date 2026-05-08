import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    description: 'Tiêu đề bài viết',
    example: 'Thông báo về bài tập lớp này',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Nội dung bài viết',
    example: 'Các bạn vui lòng nộp bài tập trước 5/5/2026',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    description: 'ID lớp học phần',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  course_class_id: number;

  @ApiPropertyOptional({
    description: 'Danh sách file URLs (nếu có attachment)',
    example: [
      'https://example.com/file1.pdf',
      'https://example.com/file2.docx',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_urls?: string[];
}
