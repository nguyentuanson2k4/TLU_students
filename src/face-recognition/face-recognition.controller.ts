import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FaceRecognitionService } from './face-recognition.service';
import { RegisterFaceDto, AttendanceFaceDto, VerifyFaceDto } from './dto/face-recognition.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Face Recognition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(private readonly faceRecognitionService: FaceRecognitionService) {}

  // ===================== HEALTH CHECK =====================

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái Face Recognition Service' })
  healthCheck() {
    return this.faceRecognitionService.checkFaceServiceHealth();
  }

  // ===================== FACE REGISTRATION =====================

  @Post('register/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Đăng ký khuôn mặt cho sinh viên (upload ảnh, max 5 ảnh)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh khuôn mặt (JPEG/PNG, max 5MB)',
        },
        note: {
          type: 'string',
          description: 'Ghi chú (vd: Ảnh chính diện)',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  registerFace(
    @Param('studentId') studentId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|webp)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: RegisterFaceDto,
  ) {
    return this.faceRecognitionService.registerFace(
      BigInt(studentId),
      file,
      dto.note,
    );
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  @ApiOperation({ summary: 'Xem danh sách ảnh khuôn mặt đã đăng ký của sinh viên' })
  getStudentFaces(@Param('studentId') studentId: string) {
    return this.faceRecognitionService.getStudentFaces(BigInt(studentId));
  }

  @Delete('faces/:faceId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa ảnh khuôn mặt (Admin only)' })
  deleteFace(@Param('faceId') faceId: string) {
    return this.faceRecognitionService.deleteFace(BigInt(faceId));
  }

  // ===================== FACE ATTENDANCE =====================

  @Post('attendance/:sessionId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Điểm danh bằng khuôn mặt (1 sinh viên)',
    description:
      'Upload ảnh khuôn mặt 1 SV. Hệ thống sẽ nhận diện và tự động điểm danh nếu match.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh khuôn mặt sinh viên',
        },
        threshold: {
          type: 'number',
          description: 'Ngưỡng similarity (0-1, mặc định 0.6)',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  attendByFace(
    @Param('sessionId') sessionId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|webp)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: AttendanceFaceDto,
  ) {
    return this.faceRecognitionService.recognizeAndAttend(
      BigInt(sessionId),
      file,
      dto.threshold,
    );
  }

  @Post('attendance/:sessionId/group')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Điểm danh nhóm bằng ảnh lớp (nhiều khuôn mặt)',
    description:
      'Upload ảnh chụp cả lớp. Hệ thống sẽ nhận diện tất cả khuôn mặt và điểm danh tự động.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh chụp nhóm / cả lớp',
        },
        threshold: {
          type: 'number',
          description: 'Ngưỡng similarity (0-1, mặc định 0.6)',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  attendGroupByFace(
    @Param('sessionId') sessionId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB for group photos
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|webp)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: AttendanceFaceDto,
  ) {
    return this.faceRecognitionService.recognizeGroupAttendance(
      BigInt(sessionId),
      file,
      dto.threshold,
    );
  }

  // ===================== VERIFY =====================

  @Post('verify/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  @ApiOperation({
    summary: 'Xác minh khuôn mặt (chỉ kiểm tra, không điểm danh)',
    description: 'Upload ảnh và kiểm tra xem khuôn mặt có khớp với SV đã đăng ký hay không.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh khuôn mặt cần xác minh',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  verifyFace(
    @Param('studentId') studentId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|webp)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.faceRecognitionService.verifyFace(BigInt(studentId), file);
  }
}
