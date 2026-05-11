import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';

@Injectable()
export class ServiceRequestNotificationService {
  private readonly logger = new Logger(ServiceRequestNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  /**
   * Notify student when service request is created
   */
  async notifyCreated(userId: bigint, requestId: bigint) {
    try {
      const title = 'Yêu cầu dịch vụ đã được tạo';
      const message = `Yêu cầu dịch vụ #${requestId} của bạn đã được tạo thành công. Vui lòng đợi xử lý từ phía quản trị viên.`;

      // Create notification in database
      await this.prisma.notification.create({
        data: {
          user_id: userId,
          title,
          message,
          notification_type: 'SERVICE_REQUEST_CREATED',
          source_id: requestId,
          is_read: false,
          fcm_sent: false,
        },
      });

      // Send FCM push notification (async, non-blocking)
      this.fcmService
        .sendToUsers([Number(userId)], title, message, {
          requestId: requestId.toString(),
          type: 'SERVICE_REQUEST_CREATED',
        })
        .then(() => {
          this.logger.log(
            `FCM sent for service request creation: ${requestId}`,
          );
        })
        .catch((err) => {
          this.logger.error(
            `FCM failed for service request creation ${requestId}: ${err.message}`,
          );
        });

      this.logger.log(
        `Notification created: Service request ${requestId} for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Notify student when service request status changes
   */
  async notifyStatusChanged(userId: bigint, requestId: bigint, status: number) {
    try {
      const statusText = this.getStatusText(status);
      const title = `Yêu cầu dịch vụ #${requestId} - ${statusText}`;
      const message = this.getStatusMessage(status);

      // Create notification in database
      await this.prisma.notification.create({
        data: {
          user_id: userId,
          title,
          message,
          notification_type: 'SERVICE_REQUEST_STATUS',
          source_id: requestId,
          is_read: false,
          fcm_sent: false,
        },
      });

      // Send FCM push notification (async, non-blocking)
      this.fcmService
        .sendToUsers([Number(userId)], title, message, {
          requestId: requestId.toString(),
          status: status.toString(),
          type: 'SERVICE_REQUEST_STATUS',
        })
        .then(() => {
          this.logger.log(
            `FCM sent for service request status update: ${requestId} -> ${statusText}`,
          );
        })
        .catch((err) => {
          this.logger.error(
            `FCM failed for service request status update ${requestId}: ${err.message}`,
          );
        });

      this.logger.log(
        `Notification status changed: Service request ${requestId} for user ${userId} - Status: ${statusText}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Convert status number to text
   */
  private getStatusText(status: number): string {
    const statusMap: { [key: number]: string } = {
      1: 'Chờ xử lý',
      2: 'Đang xử lý',
      3: 'Hoàn thành',
      4: 'Từ chối',
      5: 'Huỷ',
    };
    return statusMap[status] || 'Không xác định';
  }

  /**
   * Get user-friendly status message
   */
  private getStatusMessage(status: number): string {
    const messageMap: { [key: number]: string } = {
      1: 'Yêu cầu của bạn đang chờ xử lý',
      2: 'Yêu cầu của bạn đang được xử lý',
      3: 'Yêu cầu của bạn đã hoàn thành. Bạn có thể lấy tài liệu tại phòng quản trị.',
      4: 'Yêu cầu của bạn đã bị từ chối. Vui lòng liên hệ phòng quản trị để biết thêm chi tiết.',
      5: 'Yêu cầu của bạn đã bị huỷ.',
    };
    return messageMap[status] || 'Trạng thái của yêu cầu đã thay đổi.';
  }
}
