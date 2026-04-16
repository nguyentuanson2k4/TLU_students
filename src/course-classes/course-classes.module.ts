import { Module } from '@nestjs/common';
import { CourseClassesController } from './course-classes.controller';
import { CourseClassesService } from './course-classes.service';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [AttendanceModule],
  controllers: [CourseClassesController],
  providers: [CourseClassesService],
})
export class CourseClassesModule {}
