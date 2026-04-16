import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FaceRecognitionModule } from '../face-recognition/face-recognition.module';

@Module({
  imports: [FaceRecognitionModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export so AuthModule can use it
})
export class UsersModule {}
