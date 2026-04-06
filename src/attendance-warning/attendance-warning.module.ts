import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceWarningService } from './attendance-warning.service';
import { AttendanceWarningNotificationService } from './attendance-warning-notification.service';
import { AttendanceWarningScheduler } from './attendance-warning.scheduler';
import { AttendanceWarningController } from './attendance-warning.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * AttendanceWarningModule
 * Provides services for calculating and managing attendance warnings
 * Handles warning generation, logging, and notifications
 * Includes scheduler for automatic daily scanning
 * Exposes REST API endpoints for admin and student operations
 */
@Module({
  imports: [PrismaModule, ScheduleModule],
  controllers: [AttendanceWarningController],
  providers: [
    AttendanceWarningService,
    AttendanceWarningNotificationService,
    AttendanceWarningScheduler,
  ],
  exports: [
    AttendanceWarningService,
    AttendanceWarningNotificationService,
    AttendanceWarningScheduler,
  ],
})
export class AttendanceWarningModule {}
