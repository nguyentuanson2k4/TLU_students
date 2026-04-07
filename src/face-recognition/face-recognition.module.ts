import { Module } from '@nestjs/common';
import { FaceRecognitionController } from './face-recognition.controller';
import { FaceRecognitionService } from './face-recognition.service';
import { FaceEngineService } from './face-engine.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
  controllers: [FaceRecognitionController],
  providers: [FaceRecognitionService, FaceEngineService, CloudinaryService],
  exports: [FaceRecognitionService, FaceEngineService, CloudinaryService],
})
export class FaceRecognitionModule {}
