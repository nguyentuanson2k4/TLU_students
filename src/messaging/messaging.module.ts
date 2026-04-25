import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { FcmModule } from '../fcm/fcm.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

@Module({
  imports: [
    PrismaModule,
    FcmModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecretKey',
    }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService],
})
export class MessagingModule {}
