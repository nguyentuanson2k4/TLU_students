import { Module } from '@nestjs/common';
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
import { GpaHistoryModule } from './gpa-history/gpa-history.module';
import { ClassEnrollmentsModule } from './class-enrollments/class-enrollments.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
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
    GpaHistoryModule,
    ClassEnrollmentsModule,
    DocumentTypesModule,
    ServiceRequestsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
