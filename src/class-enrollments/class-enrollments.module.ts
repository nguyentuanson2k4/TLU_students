import { Module } from '@nestjs/common';
import { ClassEnrollmentsController } from './class-enrollments.controller';
import { ClassEnrollmentsService } from './class-enrollments.service';

@Module({
  controllers: [ClassEnrollmentsController],
  providers: [ClassEnrollmentsService]
})
export class ClassEnrollmentsModule {}
