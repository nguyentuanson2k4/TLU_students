import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminChatService } from './admin-chat.service';
import { AdminChatController } from './admin-chat.controller';
import { AdminChatGateway } from './admin-chat.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';

@Module({
  imports: [JwtModule],
  providers: [AdminChatService, AdminChatGateway, PrismaService, FcmService],
  controllers: [AdminChatController],
  exports: [AdminChatService],
})
export class AdminChatModule {}
