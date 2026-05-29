import { IsNotEmpty, IsInt, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttendanceFaceDto {
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

