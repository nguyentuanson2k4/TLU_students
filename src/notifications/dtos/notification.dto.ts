import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  BROADCAST = 'broadcast',
  CLASS = 'class',
  STUDENT_ONLY = 'student_only',
  SYSTEM = 'system',
  CLASS_REMINDER = 'class_reminder',
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Tiêu đề thông báo',
    example: 'Thông báo lịch thi',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Nội dung thông báo',
    example:
      'Kỳ thi giữa kỳ sẽ diễn ra vào ngày 15/5/2026. Tất cả sinh viên vui lòng chuẩn bị tốt.',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message?: string;

  @ApiProperty({
    description: 'Loại thông báo',
    enum: NotificationType,
    example: NotificationType.BROADCAST,
    enumName: 'NotificationType',
  })
  @IsEnum(NotificationType)
  notification_type?: NotificationType;

  @ApiPropertyOptional({
    description: 'ID lớp học (bắt buộc nếu broadcaster là CLASS)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  course_class_id?: number;

  @ApiPropertyOptional({
    description: 'ID nguồn',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  source_id?: number;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái đã đọc (true/false)',
    example: 'false',
  })
  @IsOptional()
  @IsString()
  is_read?: 'true' | 'false';

  @ApiPropertyOptional({
    description: 'Số bản ghi cần bỏ qua',
    example: '0',
  })
  @IsOptional()
  @IsString()
  skip?: string;

  @ApiPropertyOptional({
    description: 'Số bản ghi cần lấy',
    example: '20',
  })
  @IsOptional()
  @IsString()
  take?: string;
}

export class MarkAsReadDto {
  @ApiPropertyOptional({
    description: 'ID thông báo cần đánh dấu',
    example: '1',
  })
  @IsOptional()
  @IsString()
  notification_id?: string;

  @ApiPropertyOptional({
    description: 'Đánh dấu tất cả là đã đọc (true/false)',
    example: 'false',
  })
  @IsOptional()
  @IsString()
  mark_all?: 'true' | 'false';
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề thông báo',
    example: 'Cập nhật tiêu đề',
    minLength: 5,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Nội dung thông báo',
    example: 'Cập nhật nội dung thông báo',
    minLength: 10,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message?: string;
}
