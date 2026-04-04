import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationType,
} from './dtos/notification.dto';
import { Prisma, Role } from '@prisma/client';
import { NotificationsPublisher } from './notifications.publisher';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisherService: NotificationsPublisher,
  ) {}

  /**
   * sendNotification - HTTP endpoint handler
   * Validates input and publishes to RabbitMQ queue for async processing
   * Returns immediately with 'queued' status (~50-100ms)
   *
   * Actual recipient resolution and DB insertion happens asynchronously
   * via NotificationsFanoutService in the RabbitMQ consumer
   */
  async sendNotification(
    data: CreateNotificationDto,
    senderId: number,
  ): Promise<{
    status: string;
    message: string;
  }> {
    this.logger.log(
      `[Service] Validating notification: ${data.notification_type} - "${data.title}"`,
    );

    // Input validation for required fields
    if (!data.title || data.title.length < 5) {
      throw new BadRequestException('Title must be at least 5 characters');
    }
    if (!data.message || data.message.length < 10) {
      throw new BadRequestException('Message must be at least 10 characters');
    }

    // CLASS type specific validation
    if (data.notification_type === NotificationType.CLASS) {
      if (!data.course_class_id) {
        throw new BadRequestException(
          'course_class_id is required for CLASS notification type',
        );
      }

      // Verify course class exists before queuing
      const courseClass = await this.prisma.courseClass.findUnique({
        where: { id: BigInt(data.course_class_id) },
      });
      if (!courseClass) {
        throw new NotFoundException(
          `Course class with ID ${data.course_class_id} not found`,
        );
      }
    }

    // Publish to RabbitMQ queue (async)
    await this.publisherService.publishNotificationEvent({
      ...data,
      senderId,
    });

    this.logger.log(
      `[Service] Notification queued for async processing: "${data.title}"`,
    );

    // Return immediately with queued status
    return {
      status: 'queued',
      message: `Notification "${data.title}" has been queued for processing`,
    };
  }

  async getUserNotifications(
    userId: number,
    filters?: {
      is_read?: boolean;
      skip?: number;
      take?: number;
    },
  ): Promise<{
    data: any[];
    total: number;
    unreadCount: number;
  }> {
    const id = BigInt(userId);
    const skip = filters?.skip || 0;
    const take = filters?.take || 20;

    const where: Prisma.NotificationWhereInput = {
      user_id: id,
    };

    if (filters?.is_read !== undefined) {
      where.is_read = filters.is_read;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        select: {
          id: true,
          title: true,
          message: true,
          notification_type: true,
          is_read: true,
          created_at: true,
          source_id: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { user_id: id, is_read: false },
      }),
    ]);

    return {
      data: notifications.map((n) => ({
        ...n,
        id: n.id.toString(),
        source_id: n.source_id?.toString() || null,
      })),
      total,
      unreadCount,
    };
  }

  async getNotificationDetail(
    notificationId: number,
    userId: number,
  ): Promise<any> {
    const notiId = BigInt(notificationId);
    const userId_bi = BigInt(userId);

    const notification = await this.prisma.notification.findUnique({
      where: { id: notiId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Thông báo với ID ${notificationId} không tồn tại`,
      );
    }

    if (notification.user_id.toString() !== userId_bi.toString()) {
      throw new BadRequestException('Bạn không có quyền xem thông báo này');
    }

    return {
      ...notification,
      id: notification.id.toString(),
      source_id: notification.source_id?.toString() || null,
    };
  }

  async markAsRead(notificationId: number, userId: number): Promise<any> {
    const notiId = BigInt(notificationId);
    const userId_bi = BigInt(userId);

    const notification = await this.prisma.notification.findUnique({
      where: { id: notiId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Thông báo với ID ${notificationId} không tồn tại`,
      );
    }

    if (notification.user_id.toString() !== userId_bi.toString()) {
      throw new BadRequestException(
        'Bạn không có quyền cập nhật thông báo này',
      );
    }

    return this.prisma.notification.update({
      where: { id: notiId },
      data: { is_read: true },
    });
  }

  async updateNotification(
    notificationId: number,
    updateData: {
      title?: string;
      message?: string;
    },
  ): Promise<any> {
    const notiId = BigInt(notificationId);

    const notification = await this.prisma.notification.findUnique({
      where: { id: notiId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Thông báo với ID ${notificationId} không tồn tại`,
      );
    }

    const dataToUpdate: any = {};

    if (updateData.title !== undefined) {
      dataToUpdate.title = updateData.title;
    }

    if (updateData.message !== undefined) {
      dataToUpdate.message = updateData.message;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      throw new BadRequestException(
        'Cần ít nhất một trường để cập nhật (title hoặc message)',
      );
    }

    const updated = await this.prisma.notification.update({
      where: { id: notiId },
      data: dataToUpdate,
    });

    this.logger.log(`Updated notification ${notificationId}`);

    return {
      ...updated,
      id: updated.id.toString(),
      source_id: updated.source_id?.toString() || null,
    };
  }

  async markAllAsRead(userId: number): Promise<{ modifiedCount: number }> {
    const id = BigInt(userId);

    const result = await this.prisma.notification.updateMany({
      where: { user_id: id, is_read: false },
      data: { is_read: true },
    });

    this.logger.log(
      `Marked ${result.count} notifications as read for user ${userId}`,
    );

    return { modifiedCount: result.count };
  }

  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<void> {
    const notiId = BigInt(notificationId);
    const userId_bi = BigInt(userId);

    const notification = await this.prisma.notification.findUnique({
      where: { id: notiId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Thông báo với ID ${notificationId} không tồn tại`,
      );
    }

    if (notification.user_id.toString() !== userId_bi.toString()) {
      throw new BadRequestException('Bạn không có quyền xóa thông báo này');
    }

    await this.prisma.notification.delete({
      where: { id: notiId },
    });

    this.logger.log(`Deleted notification ${notificationId}`);
  }

  async getNotificationHistory(filters?: {
    notification_type?: string;
    skip?: number;
    take?: number;
  }): Promise<{
    data: any[];
    total: number;
  }> {
    const skip = filters?.skip || 0;
    const take = filters?.take || 20;

    const where: Prisma.NotificationWhereInput = {};
    if (filters?.notification_type) {
      where.notification_type = filters.notification_type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        select: {
          id: true,
          title: true,
          message: true,
          notification_type: true,
          created_at: true,
          user: { select: { username: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map((n) => ({
        ...n,
        id: n.id.toString(),
      })),
      total,
    };
  }
}
