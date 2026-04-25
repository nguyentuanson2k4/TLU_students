import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'ID phiên chat (nếu không truyền sẽ tạo mới)' })
  @IsOptional()
  sessionId?: string;

  @ApiProperty({ description: 'Nội dung tin nhắn' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
