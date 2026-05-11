import { ApiProperty } from '@nestjs/swagger';

export class UploadPostMediaDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File để upload (ảnh, PDF, Word, Excel, etc.)',
  })
  file: Express.Multer.File;
}

export class UploadPostMediaResponseDto {
  @ApiProperty({
    example: 1,
    description: 'ID của file media trên Cloudinary',
  })
  id: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/...',
    description: 'URL của file đã upload',
  })
  file_url: string;

  @ApiProperty({
    example: 'image',
    description: 'Loại file (image, pdf, document, etc.)',
  })
  file_type: string;

  @ApiProperty({
    example: 'original_filename.pdf',
    description: 'Tên file gốc',
  })
  original_filename: string;

  @ApiProperty({
    example: 245678,
    description: 'Kích thước file (bytes)',
  })
  file_size: number;

  @ApiProperty({
    example: '2026-05-11T10:00:00Z',
    description: 'Thời gian upload',
  })
  uploaded_at: Date;
}
