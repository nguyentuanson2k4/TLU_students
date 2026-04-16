import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceGateway } from './attendance.gateway';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceGateway],
  exports: [AttendanceService],
})
export class AttendanceModule {}
