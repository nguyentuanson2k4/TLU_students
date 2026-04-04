import { Module } from '@nestjs/common';
import { GpaHistoryController } from './gpa-history.controller';
import { GpaHistoryService } from './gpa-history.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GpaHistoryController],
  providers: [GpaHistoryService],
  exports: [GpaHistoryService],
})
export class GpaHistoryModule {}
