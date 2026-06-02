import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutoAbsentScheduler {
  private readonly logger = new Logger(AutoAbsentScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Quét cứ mỗi 5 phút: tìm các session hôm nay đã kết thúc
   * và tự động đánh vắng mặt cho các học sinh chưa điểm danh.
   */
  @Cron('*/5 * * * *')
  async handleAutoAbsent() {
    try {
      // 1. Lấy thời gian hiện tại và tính toán giờ theo múi giờ Việt Nam (UTC+7)
      const now = new Date();
      const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);

      // Lấy chuỗi ngày YYYY-MM-DD chính xác theo giờ Việt Nam
      const todayDateStr = vnTime.toISOString().split('T')[0];
      const todayDate = new Date(todayDateStr);

      // 2. Tìm kiếm các session chưa được xử lý auto-absent
      const allUnprocessedSessions = await this.prisma.attendanceSession.findMany({
        where: {
          is_auto_absent_processed: false,
          date: {
            not: null,
          }
        },
        include: {
          course_class: true,
        },
      });

      if (allUnprocessedSessions.length === 0) {
        return;
      }

      const currentMinutesLocal = vnTime.getUTCHours() * 60 + vnTime.getUTCMinutes();
      let processedCount = 0;

      for (const session of allUnprocessedSessions) {
        const sessionDateStr = session.date!.toISOString().split('T')[0];
        
        const lessonSlot = session.course_class?.lesson_slot;
        if (!lessonSlot) continue;

        // lesson_slot có dạng "7:00-9:00"
        const parts = lessonSlot.split('-');
        if (parts.length < 2) continue;

        const endStr = parts[1].trim(); // "9:00"
        const endParts = endStr.split(':');
        if (endParts.length < 2) continue;

        const endHour = parseInt(endParts[0], 10);
        const endMinute = parseInt(endParts[1], 10);
        const endMinutesLocal = endHour * 60 + endMinute;

        const isPastDay = sessionDateStr < todayDateStr;
        const isToday = sessionDateStr === todayDateStr;

        let hasEnded = false;
        if (isPastDay) {
          hasEnded = true; // Các ngày trước đó chắc chắn đã kết thúc
        } else if (isToday && currentMinutesLocal > endMinutesLocal) {
          hasEnded = true; // Ngày hôm nay nhưng đã qua giờ kết thúc
        }

        // Nếu buổi học đã kết thúc
        if (hasEnded) {
          // Lấy danh sách học sinh của lớp
          const enrollments = await this.prisma.classEnrollment.findMany({
            where: { course_class_id: session.course_class_id },
            select: { student_id: true },
          });

          if (enrollments.length > 0) {
            // Tạo mảng dữ liệu vắng mặt cho toàn bộ học sinh
            // Sử dụng skipDuplicates để bỏ qua những người ĐÃ có điểm danh (có mặt, đi muộn, có phép, v.v.)
            const absentData = enrollments.map((e) => ({
              session_id: session.id,
              student_id: e.student_id,
              status: 0, // Vắng mặt
              attendance_method: 'MANUAL' as const, // Enum AttendanceMethod
              note: 'Tự động điểm danh vắng mặt sau khi kết thúc buổi học',
            }));

            await this.prisma.attendanceRecord.createMany({
              data: absentData,
              skipDuplicates: true,
            });
          }

          // Đánh dấu session đã được xử lý
          await this.prisma.attendanceSession.update({
            where: { id: session.id },
            data: { is_auto_absent_processed: true },
          });

          processedCount++;
          this.logger.log(`Auto-absent processed for session ID: ${session.id}, Course Class ID: ${session.course_class_id}`);
        }
      }

      if (processedCount > 0) {
        this.logger.log(`Processed ${processedCount} sessions for auto-absent.`);
      }

    } catch (error) {
      this.logger.error('Error in AutoAbsentScheduler:', error.stack);
    }
  }
}
