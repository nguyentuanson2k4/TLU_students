import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentTypeDto {
  @ApiProperty({
    description: 'Tên loại tài liệu',
    example: 'Giấy chứng chỉ điểm',
    minLength: 1,
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'document_name là bắt buộc' })
  @IsString({ message: 'document_name phải là chuỗi' })
  @MaxLength(255, { message: 'document_name không được vượt quá 255 ký tự' })
  document_name: string;

  @ApiPropertyOptional({
    description: 'Số ngày xử lý (để tham khảo)',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'processing_days phải là một số' })
  @Min(0, { message: 'processing_days phải >= 0' })
  processing_days?: number;
}
