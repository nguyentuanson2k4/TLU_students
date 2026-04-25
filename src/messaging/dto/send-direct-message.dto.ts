import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendDirectMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn',
    example: 'Xin chào bạn!',
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
