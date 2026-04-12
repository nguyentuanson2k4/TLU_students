import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  MarkAsReadDto,
  UpdateNotificationDto,
} from './dtos/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseGuards(RolesGuard)
  @ResponseMessage('Gửi thông báo thành công')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Gửi thông báo mới',
    description: 'Chỉ admin hoặc giảng viên có thể gửi thông báo',
  })
  @ApiResponse({
    status: 201,
    description: 'Gửi thông báo thành công',
    schema: {
      example: {
        statusCode: 201,
        message: 'Gửi thông báo thành công',
        data: {
          id: 1,
          title: 'Thông báo lịch thi',
          notification_type: 'broadcast',
        },
      },
    },
  })
  async sendNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req: any,
  ) {
    this.logger.log(
      `User ${req.user.username} sending notification: ${createNotificationDto.title}`,
    );

    return this.notificationsService.sendNotification(
      createNotificationDto,
      req.user.userId || req.user.id,
    );
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseGuards(RolesGuard)
  @ResponseMessage('Lấy lịch sử gửi thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy lịch sử thông báo',
    description: 'Lấy lịch sử các thông báo đã gửi (chỉ admin và giảng viên)',
  })
  @ApiQuery({
    name: 'notification_type',
    type: 'string',
    required: false,
    description: 'Loại thông báo: broadcast, class, student_only, system',
    example: 'broadcast',
  })
  @ApiQuery({
    name: 'skip',
    type: 'number',
    required: false,
    description: 'Số bản ghi cần bỏ qua',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    type: 'number',
    required: false,
    description: 'Số bản ghi cần lấy',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy lịch sử gửi thông báo thành công',
        data: [
          { id: 1, title: 'Thông báo thi', notification_type: 'broadcast' },
        ],
      },
    },
  })
  async getNotificationHistory(
    @Query('notification_type') notificationType?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    this.logger.debug('Fetching notification history');

    return this.notificationsService.getNotificationHistory({
      notification_type: notificationType,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get()
  @ResponseMessage('Lấy danh sách thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy thông báo của tôi',
    description: 'Lấy danh sách tất cả thông báo của người dùng đã đăng nhập',
  })
  @ApiQuery({
    name: 'is_read',
    type: 'string',
    required: false,
    description: 'Lọc theo trạng thái đã đọc (true/false)',
    example: 'false',
  })
  @ApiQuery({
    name: 'skip',
    type: 'number',
    required: false,
    description: 'Số bản ghi cần bỏ qua',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    type: 'number',
    required: false,
    description: 'Số bản ghi cần lấy',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thông báo thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách thông báo thành công',
        data: [
          {
            id: 1,
            title: 'Thông báo thi',
            is_read: false,
            created_at: '2026-04-12T10:00:00Z',
          },
        ],
      },
    },
  })
  async getUserNotifications(
    @Request() req: any,
    @Query() query: NotificationQueryDto,
  ) {
    const userId = req.user.userId || req.user.id;
    this.logger.debug(`Fetching notifications for user ${userId}`);

    return this.notificationsService.getUserNotifications(userId, {
      is_read:
        query.is_read === 'true'
          ? true
          : query.is_read === 'false'
            ? false
            : undefined,
      skip: query.skip ? parseInt(query.skip) : undefined,
      take: query.take ? parseInt(query.take) : undefined,
    });
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID thông báo',
    example: 1,
  })
  @ApiOperation({
    summary: 'Lấy chi tiết thông báo',
    description: 'Lấy thông tin chi tiết của một thông báo',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thông báo thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy chi tiết thông báo thành công',
        data: {
          id: 1,
          title: 'Thông báo thi',
          message: 'Lịch thi mới',
          is_read: false,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Thông báo không tìm thấy' })
  async getNotificationDetail(
    @Param('id', new ParseIntPipe()) notificationId: number,
    @Request() req: any,
  ) {
    this.logger.debug(`Fetching notification ${notificationId}`);

    return this.notificationsService.getNotificationDetail(
      notificationId,
      req.user.userId || req.user.id,
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseGuards(RolesGuard)
  @ResponseMessage('Cập nhật thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID thông báo',
    example: 1,
  })
  @ApiOperation({
    summary: 'Cập nhật thông báo',
    description: 'Cập nhật thông tin thông báo (chỉ admin và giảng viên)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông báo thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Cập nhật thông báo thành công',
        data: {
          id: 1,
          title: 'Thông báo thi - cập nhật',
          updated_at: '2026-04-12T11:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Không có quyền thực hiện' })
  @ApiResponse({ status: 404, description: 'Thông báo không tìm thấy' })
  async updateNotification(
    @Param('id', new ParseIntPipe()) notificationId: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Request() req: any,
  ) {
    this.logger.log(
      `User ${req.user.username} updating notification ${notificationId}`,
    );

    return this.notificationsService.updateNotification(
      notificationId,
      updateNotificationDto,
    );
  }

  @Patch(':id/read')
  @ResponseMessage('Đánh dấu thông báo đã đọc thành công')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID thông báo cần đánh dấu',
    example: 1,
  })
  @ApiOperation({
    summary: 'Đánh dấu thông báo là đã đọc',
    description: 'Đánh dấu một thông báo đó là đã đọc',
  })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu thông báo thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Đánh dấu thông báo đã đọc thành công',
        data: { id: 1, is_read: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Thông báo không tìm thấy' })
  async markAsRead(
    @Param('id', new ParseIntPipe()) notificationId: number,
    @Request() req: any,
  ) {
    this.logger.debug(`Marking notification ${notificationId} as read`);

    return this.notificationsService.markAsRead(
      notificationId,
      req.user.userId || req.user.id,
    );
  }

  @Patch('read-all')
  @ResponseMessage('Đánh dấu tất cả thông báo đã đọc thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu tất cả thông báo là đã đọc',
    description: 'Đánh dấu tất cả thông báo của người dùng là đã đọc',
  })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu tất cả thông báo thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Đánh dấu tất cả thông báo đã đọc thành công',
        data: { updated_count: 5 },
      },
    },
  })
  async markAllAsRead(@Request() req: any) {
    this.logger.log(
      `Marking all notifications as read for user ${req.user.id}`,
    );

    return this.notificationsService.markAllAsRead(
      req.user.userId || req.user.id,
    );
  }

  @Delete(':id')
  @ResponseMessage('Xóa thông báo thành công')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID thông báo cần xóa',
    example: 1,
  })
  @ApiOperation({
    summary: 'Xóa thông báo',
    description: 'Xóa một thông báo',
  })
  @ApiResponse({
    status: 204,
    description: 'Xóa thông báo thành công',
  })
  @ApiResponse({ status: 404, description: 'Thông báo không tìm thấy' })
  async deleteNotification(
    @Param('id', new ParseIntPipe()) notificationId: number,
    @Request() req: any,
  ) {
    this.logger.log(`User deleting notification ${notificationId}`);

    await this.notificationsService.deleteNotification(
      notificationId,
      req.user.userId || req.user.id,
    );

    return null;
  }
}
