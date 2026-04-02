import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({ required: false, description: 'Tên đăng nhập' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false, description: 'Mật khẩu' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UserFilterDto {
  @ApiProperty({ enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false, description: 'Lọc theo trạng thái is_active (true/false)' })
  @IsOptional()
  @IsString()
  is_active?: string;
}
