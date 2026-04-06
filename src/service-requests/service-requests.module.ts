import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  ServiceRequestService,
  DocumentTypeService,
  StudentServiceRequestsService,
  AdminServiceRequestsService,
  ServiceRequestNotificationService,
} from './services';
import {
  ServiceRequestController,
  DocumentTypeController,
  StudentServiceRequestsController,
  AdminServiceRequestsController,
} from './controllers';

@Module({
  imports: [PrismaModule],
  controllers: [
    ServiceRequestController,
    DocumentTypeController,
    StudentServiceRequestsController,
    AdminServiceRequestsController,
  ],
  providers: [
    ServiceRequestService,
    DocumentTypeService,
    StudentServiceRequestsService,
    AdminServiceRequestsService,
    ServiceRequestNotificationService,
  ],
  exports: [
    ServiceRequestService,
    DocumentTypeService,
    StudentServiceRequestsService,
    AdminServiceRequestsService,
    ServiceRequestNotificationService,
  ],
})
export class ServiceRequestsModule {}
