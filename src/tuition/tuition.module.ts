import { Module } from '@nestjs/common';
import { TuitionService } from './tuition.service';
import { TuitionController } from './tuition.controller';

@Module({
  controllers: [TuitionController],
  providers: [TuitionService],
})
export class TuitionModule {}
