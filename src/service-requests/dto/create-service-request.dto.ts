import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceRequestDto {
  @ApiProperty({
    description: 'ID loại tài liệu yêu cầu',
    example: 1,
  })
  @IsNotEmpty({ message: 'Document type ID is required' })
  @IsNumber({}, { message: 'Document type ID must be a number' })
  document_type_id: number;

  @ApiProperty({
    description: 'Lý do/nội dung yêu cầu',
    example: 'Tôi cần xác nhận điểm để làm hồ sơ du học',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Reason is required' })
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason: string;

  @ApiPropertyOptional({
    description: 'URL tệp đính kèm/bằng chứng',
    example: 'https://example.com/document.pdf',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Attachment URL must be a string' })
  @MaxLength(500, { message: 'Attachment URL must not exceed 500 characters' })
  attachment_url?: string;
}
