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
