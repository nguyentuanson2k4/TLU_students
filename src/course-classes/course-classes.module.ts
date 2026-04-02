import { Module } from '@nestjs/common';
import { CourseClassesController } from './course-classes.controller';
import { CourseClassesService } from './course-classes.service';

@Module({
  controllers: [CourseClassesController],
  providers: [CourseClassesService]
})
export class CourseClassesModule {}
