import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE,
} from '../constants';

export class AttachmentValidator {
  /**
   * Validate MIME type
   */
  static validateMimeType(mimeType: string): void {
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Định dạng tập tin không được phép. Cho phép: ${ALLOWED_ATTACHMENT_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Validate file size
   */
  static validateFileSize(fileSize: number): void {
    if (fileSize > MAX_ATTACHMENT_SIZE) {
      const maxSizeMB = MAX_ATTACHMENT_SIZE / (1024 * 1024);
      throw new BadRequestException(
        `Kích thước tập tin vượt quá giới hạn tối đa ${maxSizeMB}MB`,
      );
    }
  }

  /**
   * Validate both MIME type and file size
   */
  static validateAttachment(mimeType: string, fileSize: number): void {
    this.validateMimeType(mimeType);
    this.validateFileSize(fileSize);
  }
}
