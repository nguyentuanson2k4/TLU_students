import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceRequestDto {
  @ApiPropertyOptional({
    description: 'ID loại tài liệu',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  document_type_id?: number;

  @ApiPropertyOptional({
    description: 'Lý do/nội dung yêu cầu',
    example: 'Cập nhật lý do yêu cầu',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'URL tệp đính kèm',
    example: 'https://example.com/document-updated.pdf',
  })
  @IsOptional()
  @IsString()
  attachment_url?: string;
}
