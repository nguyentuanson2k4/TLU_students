import { IsNotEmpty, IsInt, IsOptional, IsString } from 'class-validator';
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
  threshold?: number;
}

export class VerifyFaceDto {
  @ApiProperty({ description: 'ID sinh viên cần xác minh', type: Number })
  @IsNotEmpty()
  @IsInt()
  student_id: number;
}
