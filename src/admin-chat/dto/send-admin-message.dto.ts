import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendAdminMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn',
    example: 'Vấn đề của bạn đã được giải quyết',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Loại tin nhắn: TEXT, IMAGE, FILE',
    example: 'TEXT',
    default: 'TEXT',
  })
  @IsOptional()
  @IsString()
  messageType?: string;

  @ApiPropertyOptional({
    description: 'URL media đính kèm (ảnh, file)',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
