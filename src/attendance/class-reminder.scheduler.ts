import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dtos/notification.dto';

@Injectable()
export class ClassReminderScheduler {
  private readonly logger = new Logger(ClassReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Quét cứ mỗi phút: tìm các session hôm nay, sắp diễn ra trong vòng 15 phút tới,
   * và chưa được gửi nhắc nhở.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleClassReminders() {
    // this.logger.debug('Scanning for upcoming classes (15 min reminder)...');

    try {
      // 1. Lấy thời gian hiện tại và tính toán giờ theo múi giờ Việt Nam (UTC+7)
      const now = new Date();
      // Cộng 7 tiếng vào giờ UTC để biến vnTime chứa các con số khớp với giờ VN
      // Khi đó vnTime.getUTCHours() sẽ chính là giờ Việt Nam, không phụ thuộc vào timezone của server
      const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);

      // 2. Tìm kiếm session chưa được nhắc nhở
      const sessions = await this.prisma.attendanceSession.findMany({
        where: {
          is_reminder_sent: false,
          date: {
            not: null,
          },
          check_in_time: {
            not: null,
          },
        },
        include: {
          course_class: {
            include: {
              subject: true,
            },
          },
        },
      });

      // Lấy chuỗi ngày YYYY-MM-DD chính xác theo giờ Việt Nam
      const todayDateStr = vnTime.toISOString().split('T')[0];

      const upcomingSessions = sessions.filter((session) => {
        // Kiểm tra đúng ngày hôm nay không
        const sessionDateStr = session.date!.toISOString().split('T')[0];
        if (sessionDateStr !== todayDateStr) {
          return false;
        }

        // Lấy số phút của giờ bắt đầu (do app lúc lưu dùng getUTCHours() đại diện cho giờ VN)
        const checkInTime = session.check_in_time!;
        const targetMinutes = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes();
        
        // Lấy số phút của thời gian hiện tại theo đúng múi giờ VN (Render không còn bị lỗi UTC nữa)
        const currentMinutesLocal = vnTime.getUTCHours() * 60 + vnTime.getUTCMinutes();

        const diff = targetMinutes - currentMinutesLocal;

        // Nhắc nhở nếu thời gian còn lại là từ 0 đến 15 phút
        return diff >= 0 && diff <= 15;
      });

      if (upcomingSessions.length === 0) {
        return;
      }

      this.logger.log(`Found ${upcomingSessions.length} upcoming classes to remind.`);

      // 3. Xử lý gửi thông báo cho từng session
      let sentCount = 0;

      for (const session of upcomingSessions) {
        // Tìm sinh viên trong lớp
        const enrollments = await this.prisma.classEnrollment.findMany({
          where: { course_class_id: session.course_class_id },
          include: { student: true },
        });

        if (enrollments.length === 0) {
          // Lớp không có ai, đánh dấu là đã gửi để bỏ qua
          await this.prisma.attendanceSession.update({
            where: { id: session.id },
            data: { is_reminder_sent: true },
          });
          continue;
        }

        const className = session.course_class.subject.subject_name;
        const room = session.course_class.room || 'Chưa xếp phòng';
        // Hiển thị giờ
        const h = session.check_in_time!.getUTCHours().toString().padStart(2, '0');
        const m = session.check_in_time!.getUTCMinutes().toString().padStart(2, '0');

        const title = `Sắp đến giờ điểm danh lớp ${className}`;
        const message = `Lớp học phần "${className}" sắp bắt đầu lúc ${h}:${m} tại phòng ${room}. Bạn chú ý tham gia và điểm danh nhé!`;

        // Gắn vào hệ thống Notification
        // Hệ thống Notification hiện dùng sendNotification chỉ hỗ trợ theo class, student_only, broadcast.
        // Gửi qua CLASS
        await this.notificationsService.sendNotification(
          {
            title,
            message,
            notification_type: NotificationType.CLASS,
            course_class_id: Number(session.course_class_id),
          },
          -1, // -1 hoặc 0 cho bot/system id
        );

        // Đánh dấu đã gửi
        await this.prisma.attendanceSession.update({
          where: { id: session.id },
          data: { is_reminder_sent: true },
        });

        sentCount++;
        this.logger.log(`Reminder sent for course_class_id: ${session.course_class_id}`);
      }

    } catch (error) {
      this.logger.error('Error tracking class reminders:', error.stack);
    }
  }
}
