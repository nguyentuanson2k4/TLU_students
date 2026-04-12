import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentTypeDto {
  @ApiPropertyOptional({
    description: 'Tên loại tài liệu',
    example: 'Giấy chứng chỉ điểm cập nhật',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'document_name phải là chuỗi' })
  @MaxLength(255, { message: 'document_name không được vượt quá 255 ký tự' })
  document_name?: string;

  @ApiPropertyOptional({
    description: 'Số ngày xử lý',
    example: 7,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'processing_days phải là một số' })
  @Min(0, { message: 'processing_days phải >= 0' })
  processing_days?: number;
}
