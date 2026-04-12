import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDocumentTypeDto {
  @ApiPropertyOptional({
    description: 'Số trang (mặc định: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'page phải >= 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng items mỗi trang (mặc định: 20, tối đa: 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'limit phải >= 1' })
  @Max(100, { message: 'limit không được vượt quá 100' })
  limit?: number = 20;
}
