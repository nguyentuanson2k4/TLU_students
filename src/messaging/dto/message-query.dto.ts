import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessageQueryDto {
  @ApiPropertyOptional({
    description: 'Cursor (ID của tin nhắn cuối cùng đã load) để phân trang',
    example: '100',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Số lượng tin nhắn mỗi lần load (mặc định 30)',
    example: '30',
  })
  @IsOptional()
  @IsString()
  limit?: string;
}
