import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateDocumentTypeDto {
  @IsNotEmpty({ message: 'document_name là bắt buộc' })
  @IsString({ message: 'document_name phải là chuỗi' })
  @MaxLength(255, { message: 'document_name không được vượt quá 255 ký tự' })
  document_name: string;

  @IsOptional()
  @IsNumber({}, { message: 'processing_days phải là một số' })
  @Min(0, { message: 'processing_days phải >= 0' })
  processing_days?: number;
}
