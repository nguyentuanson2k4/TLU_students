import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FcmModule } from '../fcm/fcm.module';
import { FaceRecognitionModule } from '../face-recognition/face-recognition.module';
import { PostsEventController } from './posts.event.controller';

@Module({
  imports: [PrismaModule, FcmModule, FaceRecognitionModule],
  controllers: [PostsController, PostsEventController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
