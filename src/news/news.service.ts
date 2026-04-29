import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';
import { CreateNewsDto, NewsRecipientType } from './dto/create-news.dto';
import { NotificationType } from '../notifications/dtos/notification.dto';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  /**
   * Tạo tin tức mới và gửi thông báo tới các nhóm đối tượng
   * @param createNewsDto - Dữ liệu tin tức
   * @param adminId - ID của admin đăng tin
   * @returns Kết quả gửi tin tức
   */
  async createAndSendNews(
    createNewsDto: CreateNewsDto,
    adminId: number,
  ): Promise<{
    message: string;
    recipientCount: number;
  }> {
    this.logger.log(`Admin ${adminId} creating news: "${createNewsDto.title}"`);

    // Xác định danh sách user nhận tin
    const recipientUserIds = await this.getRecipientUserIds(createNewsDto);

    if (recipientUserIds.length === 0) {
      throw new BadRequestException('Không có người nhận tin tức');
    }

    // Tạo notifications trong database
    const createdNotifications = await this.prisma.notification.createMany({
      data: recipientUserIds.map((userId) => ({
        user_id: BigInt(userId),
        title: createNewsDto.title,
        message: createNewsDto.content,
        notification_type: NotificationType.NEWS,
        source_id: BigInt(adminId), // Lưu admin_id để biết ai gửi
        is_read: false,
        fcm_sent: false,
      })),
    });

    this.logger.log(
      `Created ${createdNotifications.count} notifications for news: "${createNewsDto.title}"`,
    );

    // Gửi FCM push notification (async, không block response)
    this.fcmService
      .sendToUsers(recipientUserIds, createNewsDto.title, createNewsDto.content)
      .then((result) => {
        this.logger.log(
          `FCM push sent for news: ${result.successCount} success, ${result.failureCount} failures`,
        );

        // Update fcm_sent flag
        this.prisma.notification.updateMany({
          where: {
            title: createNewsDto.title,
            notification_type: NotificationType.NEWS,
          },
          data: {
            fcm_sent: true,
          },
        });
      })
      .catch((err) => {
        this.logger.error(`FCM push failed: ${err.message}`);
      });

    this.logger.log(
      `News sent to ${recipientUserIds.length} recipients: "${createNewsDto.title}"`,
    );

    return {
      message: 'Tin tức đã được gửi thành công',
      recipientCount: recipientUserIds.length,
    };
  }

  /**
   * Xác định danh sách user nhận tin dựa trên recipient_type
   * @param createNewsDto - Dữ liệu tin tức
   * @returns Danh sách user ID
   */
  private async getRecipientUserIds(
    createNewsDto: CreateNewsDto,
  ): Promise<number[]> {
    let recipientUsers: { user_id: bigint }[] = [];

    switch (createNewsDto.recipient_type) {
      case NewsRecipientType.ALL_STUDENTS:
        // Gửi tới tất cả sinh viên
        recipientUsers = await this.prisma.student.findMany({
          where: {
            user: {
              is_active: true,
            },
          },
          select: { user_id: true },
        });
        break;

      case NewsRecipientType.BY_FACULTY:
        // Gửi tới sinh viên của các khoa được chỉ định
        if (
          !createNewsDto.department_names ||
          createNewsDto.department_names.length === 0
        ) {
          throw new BadRequestException(
            'department_names là bắt buộc khi recipient_type = BY_FACULTY',
          );
        }
        recipientUsers = await this.prisma.student.findMany({
          where: {
            department_name: {
              in: createNewsDto.department_names,
            },
            user: {
              is_active: true,
            },
          },
          select: { user_id: true },
        });
        break;

      case NewsRecipientType.BY_CLASS:
        // Gửi tới sinh viên của các lớp học phần được chỉ định
        if (
          !createNewsDto.recipient_ids ||
          createNewsDto.recipient_ids.length === 0
        ) {
          throw new BadRequestException(
            'recipient_ids là bắt buộc khi recipient_type = BY_CLASS',
          );
        }
        const classEnrollments = await this.prisma.classEnrollment.findMany({
          where: {
            course_class_id: {
              in: createNewsDto.recipient_ids.map((id) => BigInt(id)),
            },
            student: {
              user: {
                is_active: true,
              },
            },
          },
          select: {
            student: {
              select: {
                user_id: true,
              },
            },
          },
        });
        // Map to flat array
        recipientUsers = classEnrollments.map((ce) => ({
          user_id: ce.student.user_id,
        }));
        break;

      case NewsRecipientType.BY_DEPARTMENT:
        // Gửi tới sinh viên của các bộ phận (department)
        if (
          !createNewsDto.department_names ||
          createNewsDto.department_names.length === 0
        ) {
          throw new BadRequestException(
            'department_names là bắt buộc khi recipient_type = BY_DEPARTMENT',
          );
        }
        recipientUsers = await this.prisma.student.findMany({
          where: {
            department_name: {
              in: createNewsDto.department_names,
            },
            user: {
              is_active: true,
            },
          },
          select: { user_id: true },
        });
        break;

      case NewsRecipientType.SPECIFIC_USERS:
        // Gửi tới các user cụ thể
        if (
          !createNewsDto.recipient_ids ||
          createNewsDto.recipient_ids.length === 0
        ) {
          throw new BadRequestException(
            'recipient_ids là bắt buộc khi recipient_type = SPECIFIC_USERS',
          );
        }
        recipientUsers = await this.prisma.student.findMany({
          where: {
            user_id: {
              in: createNewsDto.recipient_ids.map((id) => BigInt(id)),
            },
            user: {
              is_active: true,
            },
          },
          select: { user_id: true },
        });
        break;

      default:
        throw new BadRequestException(
          `Loại đối tượng nhận không hợp lệ: ${createNewsDto.recipient_type}`,
        );
    }

    // Loại bỏ duplicates và convert về number
    const uniqueUserIds = Array.from(
      new Set(recipientUsers.map((u) => Number(u.user_id))),
    );

    return uniqueUserIds;
  }

  /**
   * Lấy danh sách tin tức kèm thông tin người gửi
   */
  async getNews(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    // Lấy notifications có notification_type = 'news' kèm thông tin admin
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          notification_type: NotificationType.NEWS,
        },
        select: {
          id: true,
          title: true,
          message: true,
          notification_type: true,
          source_id: true,
          is_read: true,
          fcm_sent: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: {
          notification_type: NotificationType.NEWS,
        },
      }),
    ]);

    // Map thêm thông tin admin
    const newsWithSender = await Promise.all(
      notifications.map(async (notification) => {
        let senderInfo: any = null;

        // Nếu có source_id, lấy thông tin admin
        if (notification.source_id) {
          const admin = await this.prisma.user.findUnique({
            where: { id: notification.source_id },
            select: {
              id: true,
              username: true,
              avatar_url: true,
            },
          });

          // Lấy thêm fullname từ Student
          if (admin) {
            const student = await this.prisma.student.findUnique({
              where: { user_id: notification.source_id },
              select: { full_name: true },
            });

            senderInfo = {
              ...admin,
              full_name: student?.full_name || admin.username,
            };
          }
        }

        return {
          ...notification,
          sender: senderInfo, // Thông tin người gửi
        };
      }),
    );

    return {
      data: newsWithSender,
      total,
      page,
      limit,
    };
  }

  /**
   * Xóa tin tức (xóa tất cả notification liên quan)
   */
  async deleteNews(newsId: number): Promise<{ message: string }> {
    this.logger.log(`Deleting news with ID: ${newsId}`);

    // Xóa tất cả notification có source_id = newsId
    await this.prisma.notification.deleteMany({
      where: {
        source_id: BigInt(newsId),
        notification_type: NotificationType.NEWS,
      },
    });

    return { message: 'Tin tức đã được xóa' };
  }
}
