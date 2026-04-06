import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarningSeverity } from '@prisma/client';

export interface NotificationResult {
  notificationId: bigint;
  userId: number;
  title: string;
  message: string;
  severity: WarningSeverity;
  sent: boolean;
  sentAt: Date;
}

@Injectable()
export class AttendanceWarningNotificationService {
  private readonly logger = new Logger(
    AttendanceWarningNotificationService.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  private getNotificationMessage(severity: WarningSeverity): string {
    switch (severity) {
      case 'Low':
        return 'Tỷ lệ vắng học của bạn đã đạt 10%. Vui lòng tăng cường tham dự các buổi học để tránh bị cảnh báo mức cao hơn. Nếu có lý do khát cơ thiết, vui lòng liên hệ với giảng viên và bộ phận Đào tạo.';

      case 'Medium':
        return 'Tỷ lệ vắng học của bạn đã đạt 15%. Tình hình vắng học của bạn đang gây lo ngại. Vui lòng liên hệ ngay với giảng viên để thảo luận về tình hình và có các biện pháp khắc phục kịp thời.';

      case 'High':
        return 'Tỷ lệ vắng học của bạn đã vượt 20% - MỨC ĐỎ! Bạn đang có nguy cơ bị cấm thi. Vui lòng liên hệ ngay với bộ phận Đào tạo và giảng viên để có giải pháp cứu cấp trước khi quá muộn.';

      default:
        return 'Có cảnh báo vắng học mới từ hệ thống.';
    }
  }

  /**
   * Get notification title based on warning severity
   * @param severity - Warning severity level
   * @returns Notification title in Vietnamese
   */
  private getNotificationTitle(severity: WarningSeverity): string {
    switch (severity) {
      case 'Low':
        return '⚠️ Cảnh báo vắng học mức thấp';

      case 'Medium':
        return '⚠️⚠️ Cảnh báo vắng học mức trung bình';

      case 'High':
        return '🚨 Cảnh báo vắng học mức cao - nguy cơ cấm thi';

      default:
        return 'Cảnh báo vắng học';
    }
  }

  /**
   * Send attendance warning notification to student
   *
   * @param studentId - Student's user ID
   * @param severity - Warning severity level (Low, Medium, High)
   * @returns Notification result with notification ID and details
   * @throws Error if student not found or notification creation fails
   *
   * @example
   * const result = await this.notificationService.sendAttendanceWarningNotification(
   *   123,
   *   'Medium'
   * );
   * // Returns: {
   * //   notificationId: 456n,
   * //   userId: 123,
   * //   title: '⚠️⚠️ Cảnh báo vắng học mức trung bình',
   * //   message: 'Tỷ lệ vắng học của bạn đã đạt 15%...',
   * //   severity: 'Medium',
   * //   sent: true,
   * //   sentAt: 2026-04-07T02:30:00.000Z
   * // }
   */
  async sendAttendanceWarningNotification(
    studentId: bigint | number,
    severity: WarningSeverity,
  ): Promise<NotificationResult> {
    try {
      // Validate severity
      if (!['Low', 'Medium', 'High'].includes(severity)) {
        throw new Error(
          `Invalid severity level: ${severity}. Must be Low, Medium, or High.`,
        );
      }

      // Get notification title and message
      const title = this.getNotificationTitle(severity);
      const message = this.getNotificationMessage(severity);

      // Create notification in database
      const notification = await this.prisma.notification.create({
        data: {
          user_id: BigInt(studentId),
          title,
          message,
          notification_type: 'attendance_warning',
          is_read: false,
        },
      });

      const result: NotificationResult = {
        notificationId: notification.id,
        userId: Number(studentId),
        title,
        message,
        severity,
        sent: true,
        sentAt: notification.created_at,
      };

      this.logger.log(
        `Attendance warning notification sent to user ${studentId}: severity=${severity}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${studentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send batch notifications to multiple students
   *
   * @param notifications - Array of student IDs and their severity levels
   * @returns Array of notification results
   *
   * @example
   * const results = await this.notificationService.sendBatchNotifications([
   *   { studentId: 1, severity: 'Low' },
   *   { studentId: 2, severity: 'Medium' },
   *   { studentId: 3, severity: 'High' },
   * ]);
   */
  async sendBatchNotifications(
    notifications: Array<{
      studentId: bigint | number;
      severity: WarningSeverity;
    }>,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const notification of notifications) {
      try {
        const result = await this.sendAttendanceWarningNotification(
          notification.studentId,
          notification.severity,
        );
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to send notification to user ${notification.studentId}:`,
          error,
        );
        // Continue processing other notifications
      }
    }

    return results;
  }

  /**
   * Mark notification as read
   *
   * @param notificationId - Notification ID
   * @returns Updated notification
   */
  async markAsRead(notificationId: bigint | number) {
    try {
      const notification = await this.prisma.notification.update({
        where: { id: BigInt(notificationId) },
        data: { is_read: true },
      });

      this.logger.log(`Notification ${notificationId} marked as read`);
      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to mark notification ${notificationId} as read:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all unread notifications for a student
   *
   * @param studentId - Student's user ID
   * @returns Array of unread notifications
   */
  async getUnreadNotifications(studentId: bigint | number) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          user_id: BigInt(studentId),
          is_read: false,
          notification_type: 'attendance_warning',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return notifications;
    } catch (error) {
      this.logger.error(
        `Failed to get unread notifications for user ${studentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all attendance warning notifications for a student (read and unread)
   *
   * @param studentId - Student's user ID
   * @param limit - Maximum number of notifications to return (default: 50)
   * @returns Array of attendance warning notifications
   */
  async getAttendanceWarningNotifications(
    studentId: bigint | number,
    limit: number = 50,
  ) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          user_id: BigInt(studentId),
          notification_type: 'attendance_warning',
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
      });

      return notifications;
    } catch (error) {
      this.logger.error(
        `Failed to get attendance warning notifications for user ${studentId}:`,
        error,
      );
      throw error;
    }
  }
}
