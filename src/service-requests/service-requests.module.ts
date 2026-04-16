import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServiceRequestsService } from './service-requests.service';
import { ServiceRequestNotificationService } from './service-request-notification.service';
import {
  StudentServiceRequestsController,
  AdminServiceRequestsController,
} from './controllers';

@Module({
  imports: [PrismaModule],
  controllers: [
    StudentServiceRequestsController,
    AdminServiceRequestsController,
  ],
  providers: [ServiceRequestsService, ServiceRequestNotificationService],
  exports: [ServiceRequestsService, ServiceRequestNotificationService],
})
export class ServiceRequestsModule {}
