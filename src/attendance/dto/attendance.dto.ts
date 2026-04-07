import { IsNotEmpty, IsInt, IsOptional, IsString, IsBoolean, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AttendanceMethod } from '@prisma/client';

// ===================== ATTENDANCE SESSION DTOs =====================

export class CreateAttendanceSessionDto {
  @ApiProperty({ description: 'ID lớp học phần', type: Number })
  @IsNotEmpty()
  @IsInt()
  course_class_id: number;

  @ApiPropertyOptional({ description: 'Thời gian check-in (HH:mm:ss)', type: String })
  @IsOptional()
  @IsString()
  check_in_time?: string;

  @ApiPropertyOptional({ description: 'Ngày điểm danh (YYYY-MM-DD)', type: String })
  @IsOptional()
  @IsString()
  date?: string;
}

export class UpdateAttendanceSessionDto extends PartialType(CreateAttendanceSessionDto) {}

// ===================== ATTENDANCE RECORD DTOs =====================

export class CreateAttendanceRecordDto {
  @ApiProperty({ description: 'ID buổi điểm danh', type: Number })
  @IsNotEmpty()
  @IsInt()
  session_id: number;

  @ApiProperty({ description: 'ID sinh viên', type: Number })
  @IsNotEmpty()
  @IsInt()
  student_id: number;

  @ApiPropertyOptional({ description: 'Thời gian đến', type: String })
  @IsOptional()
  @IsDateString()
  arrival_time?: string;

  @ApiProperty({ description: 'Trạng thái (0: Vắng, 1: Có mặt, 2: Đi muộn, 3: Có phép)', type: Number })
  @IsNotEmpty()
  @IsInt()
  status: number;

  @ApiPropertyOptional({ description: 'Điểm tin cậy (nhận diện khuôn mặt)', type: Number, default: 0 })
  @IsOptional()
  @IsNumber()
  confidence_score?: number;

  @ApiPropertyOptional({ description: 'Đánh dấu thủ công', type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  is_manual_override?: boolean;

  @ApiPropertyOptional({ description: 'URL bằng chứng điểm danh', type: String })
  @IsOptional()
  @IsString()
  evidence_url?: string;

  @ApiPropertyOptional({ description: 'Phương thức điểm danh', enum: AttendanceMethod, default: AttendanceMethod.FACE_ID })
  @IsOptional()
  @IsEnum(AttendanceMethod)
  attendance_method?: AttendanceMethod;

  @ApiPropertyOptional({ description: 'ID người cập nhật', type: Number })
  @IsOptional()
  @IsInt()
  updated_by?: number;

  @ApiPropertyOptional({ description: 'Ghi chú', type: String })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAttendanceRecordDto extends PartialType(CreateAttendanceRecordDto) {}

// ===================== BULK ATTENDANCE DTO =====================

export class BulkAttendanceRecordItem {
  @ApiProperty({ description: 'ID sinh viên', type: Number })
  @IsNotEmpty()
  @IsInt()
  student_id: number;

  @ApiProperty({ description: 'Trạng thái (0: Vắng, 1: Có mặt, 2: Đi muộn, 3: Có phép)', type: Number })
  @IsNotEmpty()
  @IsInt()
  status: number;

  @ApiPropertyOptional({ description: 'Ghi chú', type: String })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Phương thức điểm danh', enum: AttendanceMethod, default: AttendanceMethod.MANUAL })
  @IsOptional()
  @IsEnum(AttendanceMethod)
  attendance_method?: AttendanceMethod;
}

export class BulkCreateAttendanceDto {
  @ApiProperty({ description: 'ID buổi điểm danh', type: Number })
  @IsNotEmpty()
  @IsInt()
  session_id: number;

  @ApiProperty({ description: 'Danh sách điểm danh sinh viên', type: [BulkAttendanceRecordItem] })
  @IsNotEmpty()
  records: BulkAttendanceRecordItem[];
}
