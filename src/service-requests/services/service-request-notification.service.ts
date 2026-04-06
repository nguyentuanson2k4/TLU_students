import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceRequestStatus } from '../enums';

@Injectable()
export class ServiceRequestNotificationService {
  private readonly logger = new Logger(ServiceRequestNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Notify student when service request is created
   * @param userId - Student user ID
   * @param serviceRequestId - Service request ID
   */
  async notifyCreated(
    userId: bigint | number,
    serviceRequestId: bigint | number,
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: BigInt(userId),
        serviceRequestId: BigInt(serviceRequestId),
        type: 'created',
        defaultMessage: 'Yêu cầu của bạn đã được tiếp nhận và đang chờ duyệt',
        title: 'Yêu cầu dịch vụ được tiếp nhận',
      });
    } catch (error) {
      this.logger.error(
        `Failed to notify created: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Don't throw, notification failure shouldn't break main flow
    }
  }

  /**
   * Notify student when service request status changes
   * @param userId - Student user ID
   * @param serviceRequestId - Service request ID
   * @param status - New status
   * @param customMessage - Optional custom message from admin
   */
  async notifyStatusChanged(
    userId: bigint | number,
    serviceRequestId: bigint | number,
    status: number,
    customMessage?: string,
  ): Promise<void> {
    try {
      // Validate status
      if (!Object.values(ServiceRequestStatus).includes(status)) {
        this.logger.warn(`Invalid status: ${status}`);
        return;
      }

      const statusConfig = this.getStatusConfig(status);

      await this.createNotification({
        userId: BigInt(userId),
        serviceRequestId: BigInt(serviceRequestId),
        type: 'status_changed',
        defaultMessage: customMessage || statusConfig.defaultMessage,
        title: statusConfig.title,
        customMessage,
      });
    } catch (error) {
      this.logger.error(
        `Failed to notify status changed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Don't throw, notification failure shouldn't break main flow
    }
  }

  /**
   * Create notification record in database with proper formatting
   * @param config - NotificationConfig
   */
  private async createNotification(config: {
    userId: bigint;
    serviceRequestId: bigint;
    type: 'created' | 'status_changed';
    defaultMessage: string;
    title: string;
    customMessage?: string;
  }): Promise<void> {
    const message = this.buildNotificationMessage(
      config.defaultMessage,
      config.customMessage,
      config.serviceRequestId,
    );

    await this.prisma.notification.create({
      data: {
        user_id: config.userId,
        title: config.title,
        message,
        notification_type: 'service_request',
        source_id: config.serviceRequestId,
        is_read: false,
      },
    });

    this.logger.log(
      `Notification ${config.type} created for user ${config.userId} (request: ${config.serviceRequestId})`,
    );
  }

  /**
   * Format notification message
   * @param defaultMessage - Default message
   * @param customMessage - Optional custom message
   * @param serviceRequestId - Service request ID
   * @returns Formatted message
   */
  private buildNotificationMessage(
    defaultMessage: string,
    customMessage?: string,
    serviceRequestId?: bigint,
  ): string {
    let message = defaultMessage;

    if (serviceRequestId) {
      message = `Yêu cầu dịch vụ #${serviceRequestId}: ${message}`;
    }

    if (customMessage) {
      message += `\n\nGhi chú: ${customMessage}`;
    }

    return message;
  }

  /**
   * Get status configuration (title and default message)
   * @param status - Status code
   * @returns Status config
   */
  private getStatusConfig(status: number): {
    title: string;
    defaultMessage: string;
  } {
    const statusConfigs: Record<
      number,
      { title: string; defaultMessage: string }
    > = {
      [ServiceRequestStatus.PENDING]: {
        title: 'Yêu cầu dịch vụ được tạo',
        defaultMessage: 'Yêu cầu của bạn đã được tiếp nhận và đang chờ duyệt',
      },
      [ServiceRequestStatus.PROCESSING]: {
        title: 'Yêu cầu dịch vụ đang xử lý',
        defaultMessage: 'Yêu cầu của bạn đang được xử lý',
      },
      [ServiceRequestStatus.COMPLETED]: {
        title: 'Yêu cầu dịch vụ đã hoàn thành',
        defaultMessage: 'Yêu cầu của bạn đã hoàn thành',
      },
      [ServiceRequestStatus.REJECTED]: {
        title: 'Yêu cầu dịch vụ bị từ chối',
        defaultMessage: 'Yêu cầu của bạn đã bị từ chối',
      },
    };

    return (
      statusConfigs[status] || {
        title: 'Cập nhật yêu cầu dịch vụ',
        defaultMessage: 'Yêu cầu của bạn đã được cập nhật',
      }
    );
  }
}
