import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { Degree } from '@prisma/client';

export class CreateLecturerDto {
  @ApiProperty({ example: 'GV001', description: 'Mã giảng viên (dùng làm username đăng nhập)' })
  @IsString()
  @IsNotEmpty()
  lecturer_code!: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu (mặc định 123456)', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'Trần Văn B', description: 'Họ và tên' })
  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @ApiProperty({ example: 'Khoa CNTT', description: 'Phòng ban / Khoa' })
  @IsString()
  @IsNotEmpty()
  department!: string;

  @ApiProperty({ example: '0912345678', description: 'Số điện thoại' })
  @IsString()
  @IsNotEmpty()
  phone_number!: string;

  @ApiProperty({ example: 'gv001@tlu.edu.vn', description: 'Email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Công nghệ thông tin', description: 'Chuyên ngành', required: false })
  @IsOptional()
  @IsString()
  major_name?: string;

  @ApiProperty({ enum: Degree, description: 'Trình độ / Bằng cấp' })
  @IsEnum(Degree)
  @IsNotEmpty()
  degree!: Degree;
}

export class UpdateLecturerDto {
  @ApiProperty({ required: false, description: 'Họ và tên' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ required: false, description: 'Phòng ban / Khoa' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false, description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ required: false, description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Chuyên ngành' })
  @IsOptional()
  @IsString()
  major_name?: string;

  @ApiProperty({ enum: Degree, required: false, description: 'Trình độ / Bằng cấp' })
  @IsOptional()
  @IsEnum(Degree)
  degree?: Degree;
}

export class UpdateLecturerProfileDto {
  @ApiProperty({ example: '0912345678', description: 'Số điện thoại', required: false })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ example: 'gv001@tlu.edu.vn', description: 'Email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}
