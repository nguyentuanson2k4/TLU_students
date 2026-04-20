import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GeminiService } from './gemini.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController, KnowledgeBaseController],
  providers: [ChatService, GeminiService, KnowledgeBaseService],
  exports: [ChatService],
})
export class ChatModule {}
