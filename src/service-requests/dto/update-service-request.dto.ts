import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';

export class UpdateServiceRequestDto {
  @IsOptional()
  @IsNumber()
  document_type_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  attachment_url?: string;
}
