import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GpaService {
  private readonly logger = new Logger(GpaService.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('grade.updated')
  async handleGradeUpdated(payload: { studentId: string | bigint }) {
    this.logger.log(`Received grade.updated event for student ${payload.studentId}. Recalculating GPA...`);
    await this.updateGpa(BigInt(payload.studentId));
  }

  async updateGpa(studentId: bigint) {
    try {
      const grades = await this.prisma.grade.findMany({
        where: {
          enrollment: {
            student_id: studentId,
          },
        },
        include: {
          enrollment: {
            include: {
              course_class: {
                include: {
                  subject: true,
                  semester: true,
                },
              },
            },
          },
        },
      });

      let totalCreditsAll = 0;
      let totalWeightedScoreAll = 0;

      const semesterData: Record<string, { totalCredits: number; totalWeightedScore: number; semesterId: bigint }> = {};

      for (const grade of grades) {
        const credits = grade.enrollment.course_class.subject.credits;
        const score = Number(grade.score_total_10);
        const semesterIdStr = grade.enrollment.course_class.semester_id.toString();

        // Accumulate overall totals
        totalCreditsAll += credits;
        totalWeightedScoreAll += score * credits;

        // Accumulate semester totals
        if (!semesterData[semesterIdStr]) {
          semesterData[semesterIdStr] = { totalCredits: 0, totalWeightedScore: 0, semesterId: grade.enrollment.course_class.semester_id };
        }
        semesterData[semesterIdStr].totalCredits += credits;
        semesterData[semesterIdStr].totalWeightedScore += score * credits;
      }

      // Note: we calculate current overall cumulative GPA
      const gpaCumulative = totalCreditsAll > 0 ? totalWeightedScoreAll / totalCreditsAll : 0;
      const gpaCumulativeFinal = Math.round(gpaCumulative * 100) / 100;

      // 2. Upsert GPA history for each semester
      for (const semesterIdStr of Object.keys(semesterData)) {
        const data = semesterData[semesterIdStr];
        const gpaSemester = data.totalCredits > 0 ? data.totalWeightedScore / data.totalCredits : 0;
        const gpaSemesterFinal = Math.round(gpaSemester * 100) / 100;

        await this.prisma.gpaHistory.upsert({
          where: {
            student_id_semester_id: {
              student_id: studentId,
              semester_id: data.semesterId,
            },
          },
          update: {
            gpa_semester: gpaSemesterFinal,
            gpa_cumulative: gpaCumulativeFinal,
          },
          create: {
            student_id: studentId,
            semester_id: data.semesterId,
            gpa_semester: gpaSemesterFinal,
            gpa_cumulative: gpaCumulativeFinal,
          },
        });
      }

      // If the student has no grades anymore (all deleted), we might want to clear GPA history.
      // E.g., if totalCreditsAll === 0, we can delete the records or leave them at 0. Let's delete them.
      if (grades.length === 0) {
        await this.prisma.gpaHistory.deleteMany({
          where: { student_id: studentId },
        });
      }

      // 3. Update the total GPA in the Student table
      await this.prisma.student.update({
        where: { id: studentId },
        data: { gpa: gpaCumulativeFinal },
      });

      this.logger.log(`Successfully recalculated GPA for student ${studentId}. Cumulative GPA: ${gpaCumulativeFinal}`);
    } catch (error) {
      this.logger.error(`Error recalculating GPA for student ${studentId}:`, error);
    }
  }
}
