import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServiceRequestDto {
  @ApiProperty({
    description: 'ID loại tài liệu yêu cầu (thủ tục mong muốn)',
    example: 1,
  })
  @IsNotEmpty({ message: 'Document type ID is required' })
  @IsNumber({}, { message: 'Document type ID must be a number' })
  document_type_id: number;
}
