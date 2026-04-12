import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, IsDateString, IsArray, ArrayNotEmpty } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'SV001', description: 'Mã sinh viên (dùng làm username đăng nhập)' })
  @IsString()
  @IsNotEmpty()
  student_code!: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu (mặc định 123456)', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên' })
  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @ApiProperty({ example: '2000-01-15', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  dob!: string;

  @ApiProperty({ enum: Gender, description: 'Giới tính' })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender!: Gender;

  @ApiProperty({ example: '0987654321', description: 'Số điện thoại' })
  @IsString()
  @IsNotEmpty()
  phone_number!: string;

  @ApiProperty({ example: '62TH1', description: 'Lớp học' })
  @IsString()
  @IsNotEmpty()
  class_name!: string;

  @ApiProperty({ example: 'sv001@e.tlu.edu.vn', description: 'Email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Hà Nội', description: 'Địa chỉ', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Công nghệ thông tin', description: 'Chuyên ngành', required: false })
  @IsOptional()
  @IsString()
  major_name?: string;

  @ApiProperty({ example: 'Khoa CNTT', description: 'Khoa / Viện', required: false })
  @IsOptional()
  @IsString()
  department_name?: string;
}

export class UpdateStudentDto {
  @ApiProperty({ required: false, description: 'Họ và tên' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ required: false, description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiProperty({ enum: Gender, required: false, description: 'Giới tính' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ required: false, description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ required: false, description: 'Lớp học' })
  @IsOptional()
  @IsString()
  class_name?: string;

  @ApiProperty({ required: false, description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, description: 'Chuyên ngành' })
  @IsOptional()
  @IsString()
  major_name?: string;

  @ApiProperty({ required: false, description: 'Khoa / Viện' })
  @IsOptional()
  @IsString()
  department_name?: string;
}

export class UpdateStudentProfileDto {
  @ApiProperty({ example: '0987654321', description: 'Số điện thoại', required: false })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ example: 'Hà Nội', description: 'Địa chỉ', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'sv001@e.tlu.edu.vn', description: 'Email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class BulkDeleteStudentsDto {
  @ApiProperty({ example: ['SV001', 'SV002'], description: 'Danh sách mã sinh viên cần xóa' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  student_codes!: string[];
}
