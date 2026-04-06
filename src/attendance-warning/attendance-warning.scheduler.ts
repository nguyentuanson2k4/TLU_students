import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceWarningService } from './attendance-warning.service';
import { AttendanceWarningNotificationService } from './attendance-warning-notification.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceWarningScheduler {
  private readonly logger = new Logger(AttendanceWarningScheduler.name);

  private readonly LOW_THRESHOLD = 10;
  private readonly MEDIUM_THRESHOLD = 15;
  private readonly HIGH_THRESHOLD = 20;

  constructor(
    private readonly attendanceWarningService: AttendanceWarningService,
    private readonly notificationService: AttendanceWarningNotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailyAttendanceWarnings() {
    const startTime = new Date();
    this.logger.log('🚀 Starting daily attendance warning scan...');

    try {
      const students = await this.prisma.student.findMany({
        where: {
          user: {
            is_active: true,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      this.logger.log(`📊 Found ${students.length} active students to scan`);

      if (students.length === 0) {
        this.logger.log('ℹ️ No active students found');
        return;
      }

      let warningsCreated = 0;
      let studentsChecked = 0;
      let errors = 0;

      for (const student of students) {
        try {
          const enrollments = await this.prisma.classEnrollment.findMany({
            where: {
              student_id: student.id,
            },
            include: {
              course_class: true,
            },
          });

          if (enrollments.length === 0) {
            this.logger.debug(
              `Student ${student.full_name} has no class enrollments`,
            );
            continue;
          }

          studentsChecked++;

          let totalAbsent = 0;
          let totalSessions = 0;

          for (const enrollment of enrollments) {
            const attendanceRecords =
              await this.prisma.attendanceRecord.findMany({
                where: {
                  session: {
                    course_class_id: enrollment.course_class_id,
                  },
                  student_id: student.id,
                },
                include: {
                  session: true,
                },
              });

            const classAbsent = attendanceRecords.filter(
              (r) => r.status === 0,
            ).length;
            const classSessions = attendanceRecords.length;

            totalAbsent += classAbsent;
            totalSessions += classSessions;
          }

          if (totalSessions === 0) {
            this.logger.debug(
              `Student ${student.full_name} has no attendance records`,
            );
            continue;
          }

          const absencePercentage = (totalAbsent / totalSessions) * 100;

          const shouldWarn = absencePercentage >= this.LOW_THRESHOLD;

          if (shouldWarn) {
            const warning =
              await this.attendanceWarningService.generateAttendanceWarning(
                BigInt(student.user_id),
                totalAbsent,
                totalSessions,
              );

            if (warning && warning.severity) {
              this.logger.log(
                `⚠️ Warning generated for ${student.full_name}: ${warning.severity} (${absencePercentage.toFixed(2)}%)`,
              );
              warningsCreated++;
            }
          } else {
            this.logger.debug(
              `Student ${student.full_name}: Absence ${absencePercentage.toFixed(2)}% - No warning needed`,
            );
          }
        } catch (error) {
          errors++;
          this.logger.error(
            `Error processing student ${student.full_name}:`,
            error instanceof Error ? error.message : String(error),
          );
          // Continue processing other students
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logger.log('✅ Daily attendance warning scan completed', {
        totalStudents: students.length,
        studentsChecked,
        warningsCreated,
        errors,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        '❌ Critical error in attendance warning scheduler:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async manualScan(): Promise<{
    success: boolean;
    message: string;
    timestamp: Date;
  }> {
    this.logger.log('🔄 Manual attendance warning scan triggered');
    try {
      await this.handleDailyAttendanceWarnings();
      return {
        success: true,
        message: 'Manual scan completed successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Manual scan failed:',
        error instanceof Error ? error.message : String(error),
      );
      return {
        success: false,
        message: `Manual scan failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get current threshold configuration
   * @returns Current thresholds
   */
  getThresholdConfig() {
    return {
      low: this.LOW_THRESHOLD,
      medium: this.MEDIUM_THRESHOLD,
      high: this.HIGH_THRESHOLD,
    };
  }
}
