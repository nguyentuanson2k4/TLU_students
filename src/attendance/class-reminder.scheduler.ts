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
      // 1. Lấy thời điểm hiện tại và thời gian +15 phút
      const now = new Date();
      
      // Chúng ta sẽ so sánh `check_in_time` với giờ UTC theo chuỗi HH:mm
      // Vì check_in_time lưu theo dạng 1970-01-01T...Z
      const minStart = new Date(Date.UTC(1970, 0, 1, now.getUTCHours(), now.getUTCMinutes(), 0));
      
      // Thêm 15 phút
      const future = new Date(now.getTime() + 15 * 60 * 1000);
      const maxStart = new Date(Date.UTC(1970, 0, 1, future.getUTCHours(), future.getUTCMinutes(), 59));

      // 2. Tìm kiếm session
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

      // Do date và check_in_time lưu tách biệt, ta cần filter thủ công một chút 
      // để xử lý timezone hoặc logic trong code an toàn hơn.
      const todayDateStr = now.toISOString().split('T')[0];

      const upcomingSessions = sessions.filter((session) => {
        // Kiểm tra đúng ngày hôm nay không
        const sessionDateStr = session.date!.toISOString().split('T')[0];
        if (sessionDateStr !== todayDateStr) {
          return false;
        }

        // Kiểm tra giờ: có nằm trong khoảng [hiện tại, hiện tại + 15p] không
        // Chú ý: Cần chuyển cả về phút từ 0:00 để so sánh dễ hơn qua mốc qua ngày
        const checkInTime = session.check_in_time!;
        const sessionMinutes = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes();
        const nowMinutes = now.getHours() * 60 + now.getMinutes(); // dùng local time nếu app lưu local?
        // Wait, app logic: khi tạo session "7:00-9:00", app lấy parseInt("7"), lưu 1970-01-01T07:00:00Z.
        // Tức là getUTCHours() của check_in_time khớp với giờ local tại VN theo parse (thay vì timezone).
        // Let's use getUTCHours()
        const targetMinutes = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes();
        
        // Thời gian local hiện tại (ví dụ 14:00 ở VN) sẽ là giờ thực.
        // App lúc parse chuỗi tạo check_in_time là parse theo parseInt("14") r lưu Date.UTC(..., 14,...).
        // Nên targetMinutes là số phút theo giờ LOCAL của VN.
        
        // Bây giờ giờ VN local từ biến 'now':
        const vnHour = now.getHours(); // Lấy theo múi giờ server, hy vọng server đặt timezone VN!
        const vnMinute = now.getMinutes();
        const currentMinutesLocal = vnHour * 60 + vnMinute;

        const diff = targetMinutes - currentMinutesLocal;

        // <= 15 phút và >= 0 phút
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
            source_id: Number(session.id),
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
