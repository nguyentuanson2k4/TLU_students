import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'admin01', description: 'Tên đăng nhập' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ enum: Role, required: false, default: Role.ADMIN })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

