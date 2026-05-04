import {
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NewsRecipientType {
  ALL_STUDENTS = 'all_students',
  BY_FACULTY = 'by_faculty',
  BY_CLASS = 'by_class',
  BY_DEPARTMENT = 'by_department',
  SPECIFIC_USERS = 'specific_users',
}

export class CreateNewsDto {
  @ApiProperty({
    description: 'Tiêu đề tin tức',
    example: 'Thông báo lịch học lại',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Nội dung tin tức',
    example: 'Từ ngày 1/5/2026, các lớp sẽ bắt đầu học lại tại phòng máy.',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    description: 'Loại đối tượng nhận tin',
    enum: NewsRecipientType,
    example: NewsRecipientType.ALL_STUDENTS,
  })
  @IsEnum(NewsRecipientType)
  recipient_type: NewsRecipientType;

  @ApiPropertyOptional({
    description:
      'Danh sách ID đối tượng nhận (khoa ID, lớp ID, hoặc user ID - tùy vào recipient_type)',
    example: [1, 2, 3],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  recipient_ids?: number[];

  @ApiPropertyOptional({
    description:
      'Danh sách department_name (khi recipient_type = BY_DEPARTMENT)',
    example: ['Khoa CNTT', 'Khoa Kinh Tế'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  department_names?: string[];
}

export class SendNewsDto extends CreateNewsDto {}

export class NewsResponseDto {
  id: number;
  title: string;
  content: string;
  recipient_type: NewsRecipientType;
  recipient_ids: number[];
  sent_at: Date;
  recipient_count: number;
}
