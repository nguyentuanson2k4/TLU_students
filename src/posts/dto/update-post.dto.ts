import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề bài viết',
    example: 'Thông báo về bài tập lớp này (cập nhật)',
    minLength: 5,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Nội dung bài viết',
    example: 'Các bạn vui lòng nộp bài tập trước 10/5/2026',
    minLength: 10,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Danh sách file URLs',
    example: ['https://example.com/file1.pdf'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_urls?: string[];
}
