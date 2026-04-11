import { Module } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GpaHistoryController } from './gpa-history.controller';
import { GpaHistoryService } from './gpa-history.service';
import { GpaService } from './gpa.service';

@Module({
  imports: [PrismaModule],
  controllers: [GradesController, GpaHistoryController],
  providers: [GradesService, GpaHistoryService, GpaService],
  exports: [GradesService, GpaHistoryService, GpaService],
})
export class GradesModule {}
