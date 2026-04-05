import { IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateClassEnrollmentDto {
  @ApiProperty({ description: 'ID sinh viên', type: Number })
  @IsNotEmpty()
  @IsInt()
  student_id: number;

  @ApiProperty({ description: 'ID lớp học phần', type: Number })
  @IsNotEmpty()
  @IsInt()
  course_class_id: number;
}

export class UpdateClassEnrollmentDto extends PartialType(CreateClassEnrollmentDto) {}
