import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO for updating service request status
 * Used by admin or staff to manage request progression
 */
export class UpdateServiceRequestStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsNumber({}, { message: 'Status must be a number' })
  status: number;

  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  @MaxLength(500, { message: 'Message must not exceed 500 characters' })
  message?: string;

  @IsOptional()
  @IsString({ message: 'Attachment URL must be a string' })
  @MaxLength(500, { message: 'Attachment URL must not exceed 500 characters' })
  attachment_url?: string;
}
