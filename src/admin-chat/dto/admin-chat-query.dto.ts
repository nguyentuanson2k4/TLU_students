import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminChatQueryDto {
  @ApiPropertyOptional({
    description:
      'ID tin nhắn cuối cùng để load thêm tin cũ hơn (cursor-based pagination)',
    example: '50',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Số lượng tin nhắn cần lấy',
    example: '30',
    default: '30',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
