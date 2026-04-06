import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateServiceRequestDto {
  @IsNotEmpty({ message: 'Document type ID is required' })
  @IsNumber({}, { message: 'Document type ID must be a number' })
  document_type_id: number;

  @IsNotEmpty({ message: 'Reason is required' })
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason: string;

  @IsOptional()
  @IsString({ message: 'Attachment URL must be a string' })
  @MaxLength(500, { message: 'Attachment URL must not exceed 500 characters' })
  attachment_url?: string;
}
