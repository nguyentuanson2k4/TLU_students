import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FcmService } from './fcm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { RegisterFcmTokenDto, UnregisterFcmTokenDto } from './dto/fcm.dto';

@ApiTags('FCM - Push Notifications')
@ApiBearerAuth()
@Controller('fcm')
@UseGuards(JwtAuthGuard)
export class FcmController {
  private readonly logger = new Logger(FcmController.name);

  constructor(private readonly fcmService: FcmService) {}

  @Post('register')
  @ResponseMessage('Đăng ký FCM token thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng ký FCM token',
    description:
      'Đăng ký FCM token cho thiết bị hiện tại. Gọi API này khi user login hoặc mở app.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng ký FCM token thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Đăng ký FCM token thành công',
        data: { message: 'FCM token đã được đăng ký thành công' },
      },
    },
  })
  async registerToken(
    @Body() dto: RegisterFcmTokenDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    this.logger.log(`User ${userId} registering FCM token`);

    return this.fcmService.registerToken(
      userId,
      dto.token,
      dto.device_name,
      dto.platform,
    );
  }

  @Delete('unregister')
  @ResponseMessage('Hủy đăng ký FCM token thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hủy đăng ký FCM token',
    description:
      'Hủy đăng ký FCM token khi user logout. Token sẽ không nhận push nữa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy đăng ký FCM token thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Hủy đăng ký FCM token thành công',
        data: { message: 'FCM token đã được hủy đăng ký thành công' },
      },
    },
  })
  async unregisterToken(
    @Body() dto: UnregisterFcmTokenDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    this.logger.log(`User ${userId} unregistering FCM token`);

    return this.fcmService.unregisterToken(userId, dto.token);
  }

  @Get('devices')
  @ResponseMessage('Lấy danh sách thiết bị thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách thiết bị',
    description: 'Lấy danh sách tất cả thiết bị đã đăng ký FCM của user',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thiết bị thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách thiết bị thành công',
        data: [
          {
            id: '1',
            device_name: 'iPhone 15 Pro',
            platform: 'ios',
            is_active: true,
            created_at: '2026-04-12T10:00:00Z',
            updated_at: '2026-04-12T10:00:00Z',
          },
        ],
      },
    },
  })
  async getUserDevices(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    return this.fcmService.getUserDevices(userId);
  }

  @Delete('devices')
  @ResponseMessage('Hủy đăng ký tất cả thiết bị thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hủy đăng ký tất cả thiết bị',
    description:
      'Hủy đăng ký FCM token trên tất cả thiết bị (dùng khi đổi mật khẩu, v.v.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy tất cả thiết bị thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Hủy đăng ký tất cả thiết bị thành công',
        data: { count: 3 },
      },
    },
  })
  async unregisterAllDevices(@Request() req: any) {
    const userId = req.user.userId || req.user.id;
    this.logger.log(`User ${userId} unregistering all FCM tokens`);

    return this.fcmService.unregisterAllTokens(userId);
  }
}
