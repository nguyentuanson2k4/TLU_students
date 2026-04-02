import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { AdminModule } from './admin/admin.module';
import { StudentsModule } from './students/students.module';
import { LecturersModule } from './lecturers/lecturers.module';
import { SemestersModule } from './semesters/semesters.module';
import { SubjectsModule } from './subjects/subjects.module';
import { CourseClassesModule } from './course-classes/course-classes.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, MailModule, AdminModule, StudentsModule, LecturersModule, SemestersModule, SubjectsModule, CourseClassesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
