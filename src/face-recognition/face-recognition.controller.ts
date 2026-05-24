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
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FaceRecognitionService } from './face-recognition.service';
import { AttendanceFaceDto } from './dto/face-recognition.dto';
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
  constructor(private readonly faceRecognitionService: FaceRecognitionService) { }

  // ===================== HEALTH CHECK =====================

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái Face Recognition Service' })
  healthCheck() {
    return this.faceRecognitionService.checkFaceServiceHealth();
  }

  // ===================== FACE REGISTRATION =====================

  @Post('register/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Đăng ký khuôn mặt cho sinh viên (upload ảnh, max 5 ảnh) (Roles: ADMIN, LECTURER)' })
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
  ) {
    return this.faceRecognitionService.registerFace(
      BigInt(studentId),
      file,
    );
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Xem danh sách ảnh khuôn mặt của chính mình (Roles: STUDENT)' })
  getMyFaces(@Req() req: any) {
    return this.faceRecognitionService.getMyFaces(req.user);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Xem danh sách ảnh khuôn mặt đã đăng ký của sinh viên (Roles: ADMIN, LECTURER)' })
  getStudentFaces(@Param('studentId') studentId: string) {
    return this.faceRecognitionService.getStudentFaces(BigInt(studentId));
  }

  @Delete('faces/:faceId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa ảnh khuôn mặt (Roles: ADMIN)' })
  deleteFace(@Param('faceId') faceId: string) {
    return this.faceRecognitionService.deleteFace(BigInt(faceId));
  }

  // ===================== FACE ATTENDANCE =====================

  @Post('attendance/:sessionId')
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Điểm danh cá nhân bằng khuôn mặt (Self-Attendance) (Roles: STUDENT)',
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
        latitude: {
          type: 'number',
          description: 'Vĩ độ (GPS) hiện tại của thiết bị điểm danh',
        },
        longitude: {
          type: 'number',
          description: 'Kinh độ (GPS) hiện tại của thiết bị điểm danh',
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
    @Req() req: any,
  ) {
    return this.faceRecognitionService.recognizeAndAttend(
      BigInt(sessionId),
      file,
      req.user,
      dto.latitude,
      dto.longitude,
    );
  }


}
