import { IsNotEmpty, IsInt, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterFaceDto {
  @ApiPropertyOptional({
    description: 'Ghi chú (ví dụ: "Ảnh chính diện", "Ảnh nghiêng trái")',
    type: String,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AttendanceFaceDto {
  @ApiPropertyOptional({
    description: 'Ngưỡng similarity (0-1, mặc định 0.6)',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({
    description: 'Vĩ độ (GPS) hiện tại của thiết bị điểm danh',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ (GPS) hiện tại của thiết bị điểm danh',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

