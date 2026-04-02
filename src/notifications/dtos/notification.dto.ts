import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsNumber,
  IsPositive,
} from 'class-validator';

export enum NotificationType {
  BROADCAST = 'broadcast',
  CLASS = 'class',
  STUDENT_ONLY = 'student_only',
  SYSTEM = 'system',
}

export class CreateNotificationDto {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @IsEnum(NotificationType)
  notification_type: NotificationType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  course_class_id?: number;

  @IsOptional()
  @IsNumber()
  source_id?: number;
}

export class NotificationQueryDto {
  @IsOptional()
  @IsString()
  is_read?: 'true' | 'false';

  @IsOptional()
  @IsString()
  skip?: string;

  @IsOptional()
  @IsString()
  take?: string;
}

export class MarkAsReadDto {
  @IsOptional()
  @IsString()
  notification_id?: string;

  @IsOptional()
  @IsString()
  mark_all?: 'true' | 'false';
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message?: string;
}
