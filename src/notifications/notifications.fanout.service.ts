import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from './dtos/notification.dto';

@Injectable()
export class NotificationsFanoutService {
  private readonly logger = new Logger(NotificationsFanoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main processor - orchestrates recipient resolution and insertion
   */
  async process(payload: any): Promise<void> {
    try {
      this.logger.log(
        `[Fanout] Processing notification: ${payload.notification_type} - "${payload.title}"`,
      );

      // Validate required fields
      if (!payload.title || !payload.message || !payload.notification_type) {
        throw new BadRequestException(
          'Missing required fields: title, message, notification_type',
        );
      }

      // Resolve recipients based on type
      const recipientUserIds = await this.resolveRecipients(payload);

      if (recipientUserIds.length === 0) {
        this.logger.warn(
          `[Fanout] No recipients found for notification type: ${payload.notification_type}`,
        );
        return;
      }

      // Deduplicate recipients using Set
      const uniqueRecipients = Array.from(new Set(recipientUserIds));
      this.logger.debug(
        `[Fanout] Resolved ${uniqueRecipients.length} unique recipients (${recipientUserIds.length} total before dedup)`,
      );

      // Batch insert notifications
      await this.batchInsertNotifications(payload, uniqueRecipients);

      this.logger.log(
        `[Fanout] Successfully processed notification: ${payload.title}`,
      );
    } catch (error) {
      this.logger.error(
        `[Fanout] Error processing notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Resolve recipient list based on notification type
   */
  private async resolveRecipients(payload: any): Promise<string[]> {
    switch (payload.notification_type) {
      case NotificationType.BROADCAST:
        return this.resolveBroadcast();

      case NotificationType.STUDENT_ONLY:
        return this.resolveStudentOnly();

      case NotificationType.CLASS:
        if (!payload.course_class_id) {
          throw new BadRequestException(
            'course_class_id is required for CLASS notification type',
          );
        }
        return this.resolveClass(payload.course_class_id);

      case NotificationType.SYSTEM:
        return this.resolveBroadcast(); // System notifications go to all active users

      default:
        throw new BadRequestException(
          `Unknown notification type: ${payload.notification_type}`,
        );
    }
  }

  /**
   * Broadcast: All active users
   */
  private async resolveBroadcast(): Promise<string[]> {
    this.logger.debug(
      '[Fanout] Resolving BROADCAST recipients (all active users)',
    );

    const users = await this.prisma.user.findMany({
      where: { is_active: true },
      select: { id: true },
    });

    this.logger.debug(`[Fanout] Found ${users.length} active users`);
    return users.map((u) => u.id.toString());
  }

  /**
   * Student Only: All students
   */
  private async resolveStudentOnly(): Promise<string[]> {
    this.logger.debug('[Fanout] Resolving STUDENT_ONLY recipients');

    const students = await this.prisma.student.findMany({
      select: { user_id: true },
    });

    this.logger.debug(`[Fanout] Found ${students.length} students`);
    return students.map((s) => s.user_id.toString());
  }

  /**
   * Class: Students enrolled in specific course class
   */
  private async resolveClass(courseClassId: number): Promise<string[]> {
    this.logger.debug(
      `[Fanout] Resolving CLASS recipients for class ${courseClassId}`,
    );

    // Verify course class exists
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: BigInt(courseClassId) },
    });

    if (!courseClass) {
      throw new NotFoundException(
        `Course class with ID ${courseClassId} not found`,
      );
    }

    // Get enrolled students
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { course_class_id: BigInt(courseClassId) },
      select: { student: { select: { user_id: true } } },
    });

    this.logger.debug(
      `[Fanout] Found ${enrollments.length} students in class ${courseClassId}`,
    );
    return enrollments.map((e) => e.student.user_id.toString());
  }

  /**
   * Batch insert notifications (500 per batch for performance)
   */
  private async batchInsertNotifications(
    payload: any,
    recipientUserIds: string[],
  ): Promise<void> {
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(recipientUserIds.length / BATCH_SIZE);

    this.logger.log(
      `[Fanout] Starting batch insert: ${recipientUserIds.length} recipients in ${totalBatches} batch(es)`,
    );

    for (let i = 0; i < recipientUserIds.length; i += BATCH_SIZE) {
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      const batch = recipientUserIds.slice(i, i + BATCH_SIZE);

      try {
        const result = await this.prisma.notification.createMany({
          data: batch.map((userId) => ({
            user_id: BigInt(userId),
            title: payload.title,
            message: payload.message,
            notification_type: payload.notification_type,
            source_id: payload.source_id ? BigInt(payload.source_id) : null,
          })),
        });

        this.logger.debug(
          `[Fanout] Batch ${batchIndex}/${totalBatches}: Inserted ${result.count} notifications`,
        );
      } catch (error) {
        this.logger.error(
          `[Fanout] Batch ${batchIndex}/${totalBatches}: Failed to insert notifications`,
          error,
        );
        throw error;
      }
    }

    this.logger.log(
      `[Fanout] Batch insert complete: All ${recipientUserIds.length} notifications inserted`,
    );
  }
}
