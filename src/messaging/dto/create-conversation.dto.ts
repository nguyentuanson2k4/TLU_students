import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'ID của user muốn bắt đầu chat',
    example: '5',
  })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
