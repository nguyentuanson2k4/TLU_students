import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { StudentsModule } from './students/students.module';
import { LecturersModule } from './lecturers/lecturers.module';
import { SemestersModule } from './semesters/semesters.module';
import { SubjectsModule } from './subjects/subjects.module';
import { CourseClassesModule } from './course-classes/course-classes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GradesModule } from './grades/grades.module';
import { ClassEnrollmentsModule } from './class-enrollments/class-enrollments.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { UploadsModule } from './uploads/uploads.module';
import { AttendanceWarningModule } from './attendance-warning/attendance-warning.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';
import { StatisticsModule } from './statistics/statistics.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    MailModule,
    StudentsModule,
    LecturersModule,
    SemestersModule,
    SubjectsModule,
    CourseClassesModule,
    NotificationsModule,
    GradesModule,
    ClassEnrollmentsModule,
    DocumentTypesModule,
    ServiceRequestsModule,
    UploadsModule,
    AttendanceWarningModule,
    AttendanceModule,
    FaceRecognitionModule,
    StatisticsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
