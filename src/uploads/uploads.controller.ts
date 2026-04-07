import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import type { Express } from 'express';

// Type for file upload - using any due to Express.Multer.File type compatibility
type UploadFile = any;
import { UploadsService } from './uploads.service';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Upload service request attachment
   * POST /uploads/service-request-attachment
   *
   * Accepts: PDF, JPG, PNG
   * Max size: 5MB
   *
   * Returns: { url: string }
   */
  @Post('service-request-attachment')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload service request attachment (PDF, JPG, PNG)',
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Tải lên file thành công',
        data: {
          url: '/uploads/service-requests/1712472000000-1234.pdf',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size exceeds 5MB',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  uploadServiceRequestAttachment(
    @UploadedFile(FileValidationPipe) file: UploadFile,
  ) {
    const result = this.uploadsService.uploadServiceRequestAttachment(file);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Tải lên file thành công',
      data: result,
    };
  }
}
