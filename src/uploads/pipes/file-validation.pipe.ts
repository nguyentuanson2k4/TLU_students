import { Injectable, BadRequestException, PipeTransform } from '@nestjs/common';

// Type for file upload - using any due to Express.Multer.File type compatibility
type UploadFile = any;

/**
 * Validation pipe for file uploads
 * Validates MIME type and file size
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  // Allowed MIME types for service request attachments
  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ];

  // Max file size: 5MB
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB in bytes

  transform(file: UploadFile): UploadFile {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size must not exceed ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    return file;
  }
}
