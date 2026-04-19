import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'FCM registration token từ thiết bị',
    example:
      'dGhpcyBpcyBhIHRlc3QgdG9rZW4gZm9yIEZDTSBwdXNoIG5vdGlmaWNhdGlvbnM...',
  })
  @IsString()
  @MaxLength(500)
  token: string;

  @ApiPropertyOptional({
    description: 'Tên thiết bị',
    example: 'iPhone 15 Pro',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  device_name?: string;

  @ApiPropertyOptional({
    description: 'Nền tảng: android, ios, web',
    example: 'ios',
    enum: ['android', 'ios', 'web'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;
}

export class UnregisterFcmTokenDto {
  @ApiProperty({
    description: 'FCM token cần hủy đăng ký',
    example:
      'dGhpcyBpcyBhIHRlc3QgdG9rZW4gZm9yIEZDTSBwdXNoIG5vdGlmaWNhdGlvbnM...',
  })
  @IsString()
  @MaxLength(500)
  token: string;
}

export class SendPushNotificationDto {
  @ApiProperty({
    description: 'Tiêu đề thông báo push',
    example: 'Điểm danh lớp Toán cao cấp',
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Nội dung thông báo push',
    example: 'Phiên điểm danh đã mở. Vui lòng điểm danh trong 15 phút.',
  })
  @IsString()
  @MaxLength(1000)
  body: string;
}
