import { Injectable, Logger } from '@nestjs/common';
import cloudinaryModule from 'cloudinary';
import 'dotenv/config';

const cloudinary = cloudinaryModule.v2;
type UploadApiResponse = cloudinaryModule.UploadApiResponse;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    this.logger.log('Cloudinary configured successfully');
  }

  /**
   * Upload ảnh khuôn mặt lên Cloudinary.
   * @param file - Multer file object
   * @param studentCode - Mã sinh viên để tổ chức folder
   * @returns Cloudinary upload result với secure_url
   */
  async uploadFaceImage(
    file: Express.Multer.File,
    studentCode: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `faces/${studentCode}`,
          resource_type: 'image',
          transformation: [
            { width: 640, height: 640, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(error);
          }
          resolve(result!);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload ảnh bằng chứng điểm danh lên Cloudinary.
   */
  async uploadEvidenceImage(
    file: Express.Multer.File,
    sessionId: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `attendance-evidence/${sessionId}`,
          resource_type: 'image',
          transformation: [
            { width: 1280, height: 960, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(error);
          }
          resolve(result!);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Xóa ảnh trên Cloudinary theo public_id.
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted image: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId}: ${error}`);
    }
  }

  /**
   * Trích xuất public_id từ Cloudinary URL.
   */
  extractPublicId(url: string): string | null {
    try {
      // URL format: https://res.cloudinary.com/{cloud}/image/upload/v123/folder/filename.ext
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      const pathWithVersion = parts[1];
      // Remove version (v123/) if present
      const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, '');
      // Remove file extension
      return pathWithoutVersion.replace(/\.[^.]+$/, '');
    } catch {
      return null;
    }
  }

  /**
   * Upload ảnh đại diện người dùng lên Cloudinary.
   * @param file - Multer file object
   * @param userId - ID của user
   * @returns Cloudinary upload result với secure_url
   */
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `avatars/${userId}`,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary avatar upload failed: ${error.message}`);
            return reject(error);
          }
          resolve(result!);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
