import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminChatDto {
  @ApiProperty({
    description: 'ID của sinh viên hoặc admin muốn bắt đầu chat',
    example: '5',
  })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
