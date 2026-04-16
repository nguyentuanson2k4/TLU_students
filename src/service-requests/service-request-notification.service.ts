import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceRequestNotificationService {
  private readonly logger = new Logger(ServiceRequestNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Notify student when service request is created
   */
  async notifyCreated(userId: bigint, requestId: bigint) {
    try {
      this.logger.log(
        `Notification created: Service request ${requestId} for user ${userId}`,
      );
      // TODO: Implement notification sending (email, SMS, etc.)
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Notify student when service request status changes
   */
  async notifyStatusChanged(userId: bigint, requestId: bigint, status: number) {
    try {
      const statusText = this.getStatusText(status);
      this.logger.log(
        `Notification status changed: Service request ${requestId} for user ${userId} - Status: ${statusText}`,
      );
      // TODO: Implement notification sending (email, SMS, etc.)
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
      1: 'PENDING',
      2: 'PROCESSING',
      3: 'COMPLETED',
      4: 'REJECTED',
      5: 'CANCELLED',
    };
    return statusMap[status] || 'UNKNOWN';
  }
}
