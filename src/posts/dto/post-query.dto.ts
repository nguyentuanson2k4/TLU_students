import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PostQueryDto {
  @ApiPropertyOptional({
    description: 'Số bản ghi cần bỏ qua',
    example: '0',
  })
  @IsOptional()
  @IsString()
  skip?: string;

  @ApiPropertyOptional({
    description: 'Số bản ghi cần lấy (tối đa 100)',
    example: '20',
  })
  @IsOptional()
  @IsString()
  take?: string;
}
