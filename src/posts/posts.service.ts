import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';
import { CloudinaryService } from '../face-recognition/cloudinary.service';
import { CreatePostDto, PostRecipientType } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Role } from '@prisma/client';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  // ===================== TẠO THÔNG BÁO =====================

  /**
   * Tạo thông báo mới.
   * - SPECIFIC_CLASSES: GV gửi cho lớp mình dạy, hoặc Admin gửi cho nhiều lớp
   * - ALL_STUDENTS: Admin gửi cho toàn bộ sinh viên
   * - BY_DEPARTMENT: Admin gửi cho sinh viên theo khoa
   */
  async createPost(
    data: CreatePostDto,
    authorId: number,
    userRole: Role,
  ): Promise<any> {
    this.logger.log(`User ${authorId} creating post [${data.recipient_type}]`);

    let courseClassId: bigint | null = null;
    let recipientUserIds: number[] = [];

    switch (data.recipient_type) {
      case PostRecipientType.SPECIFIC_CLASSES:
        // GV gửi vào 1 lớp cụ thể
        if (data.course_class_id) {
          courseClassId = BigInt(data.course_class_id);

          // Kiểm tra lớp tồn tại
          const courseClass = await this.prisma.courseClass.findUnique({
            where: { id: courseClassId },
            include: { lecturer: true },
          });

          if (!courseClass) {
            throw new NotFoundException(
              `Lớp học phần với ID ${data.course_class_id} không tồn tại`,
            );
          }

          // Kiểm tra quyền: Chỉ GV của lớp hoặc ADMIN
          if (
            userRole !== Role.ADMIN &&
            courseClass.lecturer.user_id.toString() !== authorId.toString()
          ) {
            throw new ForbiddenException(
              'Bạn không có quyền đăng thông báo trong lớp này',
            );
          }

          // Lấy danh sách SV trong lớp để gửi FCM
          const enrollments = await this.prisma.classEnrollment.findMany({
            where: { course_class_id: courseClassId },
            select: { student: { select: { user_id: true } } },
          });
          recipientUserIds = enrollments.map((e) => Number(e.student.user_id));
        } else if (data.recipient_ids && data.recipient_ids.length > 0) {
          // Admin gửi cho nhiều lớp
          if (userRole !== Role.ADMIN) {
            throw new ForbiddenException(
              'Chỉ Admin mới có thể gửi thông báo cho nhiều lớp cùng lúc',
            );
          }

          // Validate tất cả lớp tồn tại
          const classes = await this.prisma.courseClass.findMany({
            where: { id: { in: data.recipient_ids.map((id) => BigInt(id)) } },
          });
          if (classes.length !== data.recipient_ids.length) {
            throw new BadRequestException(
              'Một số ID lớp học phần không tồn tại',
            );
          }

          // Lấy SV trong các lớp
          const enrollments = await this.prisma.classEnrollment.findMany({
            where: {
              course_class_id: {
                in: data.recipient_ids.map((id) => BigInt(id)),
              },
              student: { user: { is_active: true } },
            },
            select: { student: { select: { user_id: true } } },
          });
          recipientUserIds = Array.from(
            new Set(enrollments.map((e) => Number(e.student.user_id))),
          );
        } else {
          throw new BadRequestException(
            'Phải cung cấp course_class_id hoặc recipient_ids khi recipient_type = SPECIFIC_CLASSES',
          );
        }
        break;

      case PostRecipientType.ALL_STUDENTS:
        // Chỉ ADMIN mới được gửi toàn trường
        if (userRole !== Role.ADMIN) {
          throw new ForbiddenException(
            'Chỉ Admin mới có thể gửi thông báo cho toàn bộ sinh viên',
          );
        }

        const allStudents = await this.prisma.student.findMany({
          where: { user: { is_active: true } },
          select: { user_id: true },
        });
        recipientUserIds = allStudents.map((s) => Number(s.user_id));
        break;

      case PostRecipientType.BY_DEPARTMENT:
        // Chỉ ADMIN
        if (userRole !== Role.ADMIN) {
          throw new ForbiddenException(
            'Chỉ Admin mới có thể gửi thông báo theo khoa',
          );
        }
        if (!data.department_names || data.department_names.length === 0) {
          throw new BadRequestException(
            'department_names là bắt buộc khi recipient_type = BY_DEPARTMENT',
          );
        }

        const deptStudents = await this.prisma.student.findMany({
          where: {
            department_name: { in: data.department_names },
            user: { is_active: true },
          },
          select: { user_id: true },
        });
        recipientUserIds = Array.from(
          new Set(deptStudents.map((s) => Number(s.user_id))),
        );
        break;

      default:
        throw new BadRequestException(
          `Loại đối tượng nhận không hợp lệ: ${data.recipient_type}`,
        );
    }

    if (recipientUserIds.length === 0) {
      throw new BadRequestException('Không tìm thấy người nhận thông báo nào');
    }

    // Tạo Post
    const post = await this.prisma.post.create({
      data: {
        author_id: BigInt(authorId),
        course_class_id: courseClassId,
        title: data.title,
        content: data.content,
        post_type: 1,
        recipient_type: data.recipient_type as any,
        recipient_ids: JSON.stringify(recipientUserIds),
        status: 'PUBLISHED' as any,
        published_at: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          },
        },
        course_class: {
          select: {
            id: true,
            subject: { select: { subject_name: true } },
          },
        },
      },
    });

    // Thêm media nếu có
    if (data.media_urls && data.media_urls.length > 0) {
      await this.prisma.postMedia.createMany({
        data: data.media_urls.map((url) => ({
          post_id: post.id,
          file_url: url,
          file_type: this.getFileType(url),
        })),
      });
    }

    // Bắn sự kiện sang RabbitMQ để tạo Notification & gửi FCM ngầm (Tránh khóa luồng chính)
    this.logger.log(`Emitting 'post_created_fanout' to RabbitMQ for ${recipientUserIds.length} users`);
    this.rabbitmqService.emit('post_created_fanout', {
      postId: post.id.toString(), // BigInt to string for JSON serialization
      recipientUserIds,
      title: data.title,
      content: data.content,
    });

    this.logger.log(
      `Post created with ID ${post.id}, queued notifications to ${recipientUserIds.length} recipients`,
    );

    return {
      ...this.formatPostResponse(post),
      recipientCount: recipientUserIds.length,
    };
  }

  // ===================== LẤY THÔNG BÁO THEO LỚP =====================

  /**
   * Lấy danh sách thông báo của lớp học phần
   * SV chỉ xem posts của lớp mình đăng ký, GV xem posts lớp mình dạy
   */
  async getPostsByClass(
    courseClassId: number,
    userId: number,
    userRole: Role,
    skip: number = 0,
    take: number = 20,
  ): Promise<any> {
    this.logger.log(
      `User ${userId} retrieving posts for class ${courseClassId}`,
    );

    const classId = BigInt(courseClassId);

    // Kiểm tra lớp tồn tại
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: classId },
      include: { lecturer: true },
    });

    if (!courseClass) {
      throw new NotFoundException(
        `Lớp học phần với ID ${courseClassId} không tồn tại`,
      );
    }

    // Kiểm tra quyền truy cập
    if (userRole === Role.STUDENT) {
      const enrollment = await this.prisma.classEnrollment.findFirst({
        where: {
          course_class_id: classId,
          student: { user_id: BigInt(userId) },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'Bạn không được đăng ký lớp này để xem thông báo',
        );
      }
    } else if (userRole === Role.LECTURER) {
      if (courseClass.lecturer.user_id.toString() !== userId.toString()) {
        throw new ForbiddenException('Bạn không dạy lớp này để xem thông báo');
      }
    }
    // ADMIN xem được tất cả

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          course_class_id: classId,
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
          media: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: Math.min(take, 100),
      }),
      this.prisma.post.count({
        where: {
          course_class_id: classId,
          status: 'PUBLISHED',
        },
      }),
    ]);

    return {
      data: posts.map((p) => this.formatPostResponse(p)),
      total,
      skip,
      take: Math.min(take, 100),
    };
  }

  // ===================== LẤY THÔNG BÁO TOÀN TRƯỜNG =====================

  /**
   * Lấy danh sách thông báo diện rộng (ALL_STUDENTS, BY_DEPARTMENT)
   * Tất cả user đều có thể xem
   */
  async getGlobalPosts(page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const safeTake = Math.min(limit, 100);

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          recipient_type: { in: ['ALL_STUDENTS', 'BY_DEPARTMENT'] as any[] },
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
          media: true,
        },
        orderBy: { published_at: 'desc' },
        skip,
        take: safeTake,
      }),
      this.prisma.post.count({
        where: {
          recipient_type: { in: ['ALL_STUDENTS', 'BY_DEPARTMENT'] as any[] },
          status: 'PUBLISHED',
        },
      }),
    ]);

    return {
      data: posts.map((p) => this.formatPostResponse(p)),
      total,
      page,
      limit: safeTake,
    };
  }

  // ===================== LẤY TẤT CẢ THÔNG BÁO DÀNH CHO SV =====================

  /**
   * Lấy tất cả thông báo dành cho sinh viên hiện tại:
   * - Các thông báo toàn trường (ALL_STUDENTS)
   * - Các thông báo theo khoa của SV (BY_DEPARTMENT)
   * - Các thông báo trong các lớp SV đang đăng ký (SPECIFIC_CLASSES)
   */
  async getMyFeed(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const safeTake = Math.min(limit, 100);

    // Lấy thông tin sinh viên
    const student = await this.prisma.student.findFirst({
      where: { user_id: BigInt(userId) },
      select: {
        id: true,
        department_name: true,
        enrollments: {
          select: { course_class_id: true },
        },
      },
    });

    // Build filter conditions
    const orConditions: any[] = [{ recipient_type: 'ALL_STUDENTS' as any }];

    if (student) {
      // Thông báo theo khoa
      if (student.department_name) {
        // Thông báo BY_DEPARTMENT mà chứa khoa của SV (check recipient_ids)
        orConditions.push({ recipient_type: 'BY_DEPARTMENT' as any });
      }

      // Thông báo trong lớp SV đăng ký
      const classIds = student.enrollments.map((e) => e.course_class_id);
      if (classIds.length > 0) {
        orConditions.push({
          recipient_type: 'SPECIFIC_CLASSES' as any,
          course_class_id: { in: classIds },
        });
      }
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          OR: orConditions,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar_url: true,
            },
          },
          course_class: {
            select: {
              id: true,
              subject: { select: { subject_name: true } },
            },
          },
          media: true,
        },
        orderBy: { published_at: 'desc' },
        skip,
        take: safeTake,
      }),
      this.prisma.post.count({
        where: {
          status: 'PUBLISHED',
          OR: orConditions,
        },
      }),
    ]);

    return {
      data: posts.map((p) => this.formatPostResponse(p)),
      total,
      page,
      limit: safeTake,
    };
  }

  // ===================== CHI TIẾT THÔNG BÁO =====================

  /**
   * Lấy chi tiết một bài thông báo
   */
  async getPostDetail(
    postId: number,
    userId: number,
    userRole: Role,
  ): Promise<any> {
    const id = BigInt(postId);

    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          },
        },
        course_class: {
          include: { lecturer: true },
        },
        media: true,
      },
    });

    if (!post) {
      throw new NotFoundException(
        `Bài thông báo với ID ${postId} không tồn tại`,
      );
    }

    // Nếu là post của lớp cụ thể => kiểm tra quyền xem
    if (
      post.course_class_id &&
      post.recipient_type === ('SPECIFIC_CLASSES' as any)
    ) {
      if (userRole === Role.STUDENT) {
        const enrollment = await this.prisma.classEnrollment.findFirst({
          where: {
            course_class_id: post.course_class_id,
            student: { user_id: BigInt(userId) },
          },
        });

        if (!enrollment) {
          throw new ForbiddenException(
            'Bạn không được đăng ký lớp này để xem thông báo',
          );
        }
      } else if (userRole === Role.LECTURER && post.course_class) {
        if (
          post.course_class.lecturer.user_id.toString() !== userId.toString()
        ) {
          throw new ForbiddenException(
            'Bạn không dạy lớp này để xem thông báo',
          );
        }
      }
    }
    // Thông báo ALL_STUDENTS / BY_DEPARTMENT => tất cả đều xem được

    return this.formatPostResponse(post);
  }

  // ===================== CẬP NHẬT THÔNG BÁO =====================

  /**
   * Cập nhật bài thông báo
   * Chỉ tác giả hoặc ADMIN mới có thể cập nhật
   */
  async updatePost(
    postId: number,
    data: UpdatePostDto,
    userId: number,
    userRole: Role,
  ): Promise<any> {
    this.logger.log(`User ${userId} updating post ${postId}`);

    const id = BigInt(postId);

    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(
        `Bài thông báo với ID ${postId} không tồn tại`,
      );
    }

    // Kiểm tra quyền
    if (
      userRole !== Role.ADMIN &&
      post.author_id.toString() !== userId.toString()
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật bài thông báo này',
      );
    }

    // Cập nhật post
    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: {
        title: data.title || post.title,
        content: data.content || post.content,
        updated_at: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          },
        },
        media: true,
      },
    });

    // Cập nhật media nếu có
    if (data.media_urls) {
      await this.prisma.postMedia.deleteMany({
        where: { post_id: id },
      });

      if (data.media_urls.length > 0) {
        await this.prisma.postMedia.createMany({
          data: data.media_urls.map((url) => ({
            post_id: id,
            file_url: url,
            file_type: this.getFileType(url),
          })),
        });
      }
    }

    this.logger.log(`Post ${postId} updated successfully`);

    return this.formatPostResponse(updatedPost);
  }

  // ===================== XÓA THÔNG BÁO =====================

  /**
   * Xóa bài thông báo
   * Chỉ tác giả hoặc ADMIN mới có thể xóa
   */
  async deletePost(
    postId: number,
    userId: number,
    userRole: Role,
  ): Promise<any> {
    this.logger.log(
      `User ${userId} (role: ${userRole}) attempting to delete post ${postId}`,
    );

    const id = BigInt(postId);
    const userIdBigInt = BigInt(userId);

    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(
        `Bài thông báo với ID ${postId} không tồn tại`,
      );
    }

    // Kiểm tra quyền: ADMIN hoặc tác giả
    const isAdmin = userRole === Role.ADMIN || String(userRole) === 'ADMIN';
    const isAuthor = post.author_id === userIdBigInt;

    this.logger.debug(
      `Permission check: isAdmin=${isAdmin}, isAuthor=${isAuthor}, userRole=${userRole}, authorId=${post.author_id}, userId=${userIdBigInt}`,
    );

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('Bạn không có quyền xóa bài thông báo này');
    }

    // Xóa post (media sẽ tự cascade delete nhờ onDelete: Cascade trong schema)
    await this.prisma.post.delete({
      where: { id },
    });

    this.logger.log(`Post ${postId} deleted successfully by user ${userId}`);

    return { message: 'Bài thông báo đã được xóa thành công' };
  }

  // ===================== BÀI POST CỦA TÔI =====================

  /**
   * Lấy danh sách thông báo do GV/Admin tạo
   */
  async getMyPosts(
    userId: number,
    skip: number = 0,
    take: number = 20,
  ): Promise<any> {
    this.logger.log(`Retrieving posts by user ${userId}`);

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { author_id: BigInt(userId) },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar_url: true,
            },
          },
          course_class: {
            select: {
              id: true,
              subject: { select: { subject_name: true } },
            },
          },
          media: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: Math.min(take, 100),
      }),
      this.prisma.post.count({
        where: { author_id: BigInt(userId) },
      }),
    ]);

    return {
      data: posts.map((p) => this.formatPostResponse(p)),
      total,
      skip,
      take: Math.min(take, 100),
    };
  }

  // ===================== UPLOAD FILE MEDIA =====================

  /**
   * Upload file media cho post lên Cloudinary + lưu vào database
   * @param file - Multer file object
   * @param postId - ID của post
   * @returns Object chứa file_url, file_type, file_name, file_size
   */
  async uploadPostMedia(
    file: Express.Multer.File,
    postId: number,
  ): Promise<any> {
    try {
      if (!file) {
        throw new BadRequestException('Không có file được upload');
      }

      // Validate file size (max 50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('Kích thước file vượt quá 50MB');
      }

      // Validate file type
      const ALLOWED_MIMETYPES = [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Archives
        'application/zip',
        'application/x-rar-compressed',
      ];

      if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type không được hỗ trợ: ${file.mimetype}`,
        );
      }

      // Validate post exists
      const post = await this.prisma.post.findUnique({
        where: { id: BigInt(postId) },
      });

      if (!post) {
        throw new NotFoundException(`Post với ID ${postId} không tồn tại`);
      }

      // Upload to Cloudinary
      this.logger.log(`Uploading file ${file.originalname} for post ${postId}`);

      const uploadResult = await this.cloudinaryService.uploadPostMedia(
        file,
        postId.toString(),
      );

      const fileType = this.getFileType(uploadResult.secure_url);

      // Save media to database
      const savedMedia = await this.prisma.postMedia.create({
        data: {
          post_id: BigInt(postId),
          file_url: uploadResult.secure_url,
          file_type: fileType,
        },
      });

      const response = {
        id: savedMedia.id.toString(),
        file_url: savedMedia.file_url,
        file_type: savedMedia.file_type,
        original_filename: file.originalname,
        file_size: file.size,
        uploaded_at: new Date(),
      };

      this.logger.log(`File uploaded successfully: ${uploadResult.public_id}`);

      return response;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Failed to upload file: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  // ===================== WORKER RABBITMQ =====================
  /**
   * Chạy ngầm: Xử lý thông báo sau khi Post được tạo
   * Chia nhỏ (chunk) danh sách người nhận để tạo DB và bắn FCM an toàn
   */
  async handlePostCreatedFanout(data: {
    postId: string;
    recipientUserIds: number[];
    title: string;
    content: string;
  }): Promise<void> {
    const { postId, recipientUserIds, title, content } = data;
    this.logger.log(`[Worker] Bắt đầu xử lý ${recipientUserIds.length} notifications cho Post ${postId}`);
    
    const CHUNK_SIZE = 100; // Chia nhỏ mỗi 100 người
    for (let i = 0; i < recipientUserIds.length; i += CHUNK_SIZE) {
      const chunk = recipientUserIds.slice(i, i + CHUNK_SIZE);
      
      try {
        // 1. Lưu vào Database
        await this.prisma.notification.createMany({
          data: chunk.map((userId) => ({
            user_id: BigInt(userId),
            title: title,
            message: content.length > 200 ? content.substring(0, 200) + '...' : content,
            notification_type: 'POST',
            source_id: BigInt(postId),
            is_read: false,
            fcm_sent: true, // Đã gửi FCM ngầm nên đánh dấu true luôn
          })),
        });

        // 2. Bắn Push Notification (FCM)
        const fcmResult = await this.fcmService.sendToUsers(chunk, title, content);
        this.logger.log(
          `[Worker] Chunk ${i / CHUNK_SIZE + 1}: FCM push ${fcmResult.successCount} thành công, ${fcmResult.failureCount} thất bại`
        );
      } catch (error: any) {
        this.logger.error(`[Worker] Lỗi xử lý chunk ${i / CHUNK_SIZE + 1} cho Post ${postId}: ${error.message}`);
        // Quăng lỗi ra để RabbitMQ biết mà NACK (Không xóa tin nhắn, giữ lại Retry)
        throw error; 
      }
    }
    
    this.logger.log(`[Worker] Đã xử lý xong toàn bộ thông báo cho Post ${postId}`);
  }

  // ===================== HELPER =====================


  /**
   * Format response cho post
   */
  private formatPostResponse(post: any): any {
    return {
      id: post.id.toString(),
      author: post.author
        ? {
            id: post.author.id.toString(),
            username: post.author.username,
            avatar_url: post.author.avatar_url,
          }
        : null,
      title: post.title,
      content: post.content,
      recipient_type: post.recipient_type,
      status: post.status,
      course_class_id: post.course_class_id?.toString() || null,
      course_class: post.course_class
        ? {
            id: post.course_class.id.toString(),
            subject_name: post.course_class.subject?.subject_name || null,
          }
        : null,
      media:
        post.media?.map((m: any) => ({
          id: m.id.toString(),
          file_url: m.file_url,
          file_type: m.file_type,
        })) || [],
      published_at: post.published_at,
      created_at: post.created_at,
      updated_at: post.updated_at,
    };
  }

  /**
   * Extract file type from URL
   */
  private getFileType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || 'file';
    if (
      ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)
    ) {
      return extension;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    }
    if (['mp4', 'avi', 'mov', 'mkv'].includes(extension)) {
      return 'video';
    }
    return 'file';
  }
}
