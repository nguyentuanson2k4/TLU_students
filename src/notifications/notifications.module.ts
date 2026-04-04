import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsConsumerController } from './notifications.consumer.controller';
import { NotificationsPublisher } from './notifications.publisher';
import { NotificationsFanoutService } from './notifications.fanout.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, NotificationsConsumerController],
  providers: [
    NotificationsService,
    NotificationsPublisher,
    NotificationsFanoutService,
  ],
  exports: [
    NotificationsService,
    NotificationsPublisher,
    NotificationsFanoutService,
  ],
})
export class NotificationsModule {}
