import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDocumentTypeDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'page phải >= 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'limit phải >= 1' })
  @Max(100, { message: 'limit không được vượt quá 100' })
  limit?: number = 20;
}
