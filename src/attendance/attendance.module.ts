import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceGateway } from './attendance.gateway';
import { ClassReminderScheduler } from './class-reminder.scheduler';
import { AutoAbsentScheduler } from './auto-absent.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceGateway, ClassReminderScheduler, AutoAbsentScheduler],
  exports: [AttendanceService],
})
export class AttendanceModule {}
