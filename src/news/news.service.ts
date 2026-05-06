import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';
import { CreateNewsDto, NewsRecipientType } from './dto/create-news.dto';

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

    // Tạo News record trong database
    const createdNews = await this.prisma.news.create({
      data: {
        title: createNewsDto.title,
        content: createNewsDto.content,
        author_id: BigInt(adminId),
        recipient_type: createNewsDto.recipient_type as any,
        recipient_ids: JSON.stringify(recipientUserIds), // Lưu danh sách ID dưới dạng JSON
        status: 'PUBLISHED' as any,
        published_at: new Date(),
      },
    });

    this.logger.log(`Created news in database with ID: ${createdNews.id}`);

    // Gửi FCM push notification (async, không block response)
    this.fcmService
      .sendToUsers(recipientUserIds, createNewsDto.title, createNewsDto.content)
      .then((result) => {
        this.logger.log(
          `FCM push sent for news ID ${createdNews.id}: ${result.successCount} success, ${result.failureCount} failures`,
        );
      })
      .catch((err) => {
        this.logger.error(
          `FCM push failed for news ID ${createdNews.id}: ${err.message}`,
        );
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

    // Lấy news records từ bảng News
    const [newsList, total] = await Promise.all([
      this.prisma.news.findMany({
        where: {
          status: 'PUBLISHED',
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar_url: true,
            },
          },
        },
        orderBy: {
          published_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.news.count({
        where: {
          status: 'PUBLISHED',
        },
      }),
    ]);

    // Parse recipient_ids từ JSON string
    const newsWithParsedIds = newsList.map((news) => ({
      ...news,
      recipient_ids: news.recipient_ids ? JSON.parse(news.recipient_ids) : [],
      author: {
        ...news.author,
        full_name: news.author.username, // Có thể lấy thêm từ Student nếu cần
      },
    }));

    return {
      data: newsWithParsedIds,
      total,
      page,
      limit,
    };
  }

  /**
   * Xóa tin tức
   */
  async deleteNews(newsId: number): Promise<{ message: string }> {
    this.logger.log(`Deleting news with ID: ${newsId}`);

    // Xóa News record
    await this.prisma.news.delete({
      where: {
        id: BigInt(newsId),
      },
    });

    this.logger.log(`News with ID ${newsId} deleted successfully`);

    return { message: 'Tin tức đã được xóa' };
  }
}
