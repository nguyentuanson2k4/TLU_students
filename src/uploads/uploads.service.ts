import { Injectable } from '@nestjs/common';

// Type for file upload - using any due to Express.Multer.File type compatibility
type UploadFile = any;
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for handling file uploads
 * Manages file storage and URL generation
 */
@Injectable()
export class UploadsService {
  // Directory where files will be stored
  private readonly uploadDir = path.join(
    process.cwd(),
    'uploads',
    'service-requests',
  );

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload a file for service request attachment
   * @param file - Multer file object
   * @returns Object with file URL
   */
  uploadServiceRequestAttachment(file: UploadFile): {
    url: string;
  } {
    if (!file) {
      throw new Error('File is required');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const fileExtension = path.extname(file.originalname);
    const fileName = `${timestamp}-${random}${fileExtension}`;

    // Full file path
    const filePath = path.join(this.uploadDir, fileName);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Generate URL (relative to public access)
    // Assuming files will be served at /uploads/service-requests/:filename
    const url = `/uploads/service-requests/${fileName}`;

    return { url };
  }

  /**
   * Delete a file by URL
   * @param url - File URL (e.g., /uploads/service-requests/filename)
   */
  deleteFile(url: string): void {
    try {
      const fileName = url.split('/').pop();
      if (!fileName) return;

      const filePath = path.join(this.uploadDir, fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}
