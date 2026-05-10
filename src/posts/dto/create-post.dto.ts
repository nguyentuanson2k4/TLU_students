import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  MinLength,
  MaxLength,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PostRecipientType {
  ALL_STUDENTS = 'ALL_STUDENTS',
  SPECIFIC_CLASSES = 'SPECIFIC_CLASSES',
  BY_DEPARTMENT = 'BY_DEPARTMENT',
}

export class CreatePostDto {
  @ApiProperty({
    description: 'Tiêu đề thông báo',
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
    description: 'Nội dung thông báo',
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
    description:
      'Loại đối tượng nhận: ALL_STUDENTS (toàn bộ SV), SPECIFIC_CLASSES (lớp học phần cụ thể), BY_DEPARTMENT (theo khoa)',
    enum: PostRecipientType,
    example: PostRecipientType.SPECIFIC_CLASSES,
  })
  @IsEnum(PostRecipientType)
  recipient_type: PostRecipientType;

  @ApiPropertyOptional({
    description:
      'ID lớp học phần (bắt buộc khi recipient_type = SPECIFIC_CLASSES, chỉ gửi vào 1 lớp)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  course_class_id?: number;

  @ApiPropertyOptional({
    description:
      'Danh sách ID lớp học phần (khi recipient_type = SPECIFIC_CLASSES, gửi tới nhiều lớp)',
    example: [1, 2, 3],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  recipient_ids?: number[];

  @ApiPropertyOptional({
    description:
      'Danh sách tên khoa (khi recipient_type = BY_DEPARTMENT)',
    example: ['Khoa CNTT', 'Khoa Kinh Tế'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  department_names?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách file URLs (nếu có đính kèm)',
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
