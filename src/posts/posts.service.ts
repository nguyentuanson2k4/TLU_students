import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo bài post mới cho lớp học phần
   * Chỉ GV của lớp đó mới có thể tạo
   */
  async createPost(
    data: CreatePostDto,
    authorId: number,
    userRole: Role,
  ): Promise<any> {
    this.logger.log(
      `User ${authorId} creating post in class ${data.course_class_id}`,
    );

    // Kiểm tra lớp học phần tồn tại
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: BigInt(data.course_class_id) },
      include: { lecturer: true },
    });

    if (!courseClass) {
      throw new NotFoundException(
        `Lớp học phần với ID ${data.course_class_id} không tồn tại`,
      );
    }

    // Kiểm tra quyền: Chỉ GV của lớp hoặc ADMIN mới có thể post
    if (
      userRole !== Role.ADMIN &&
      courseClass.lecturer.user_id.toString() !== authorId.toString()
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền post thông báo trong lớp này',
      );
    }

    // Tạo post
    const post = await this.prisma.post.create({
      data: {
        author_id: BigInt(authorId),
        course_class_id: BigInt(data.course_class_id),
        title: data.title,
        content: data.content,
        post_type: 1, // 1 = announcement
        created_at: new Date(),
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

    this.logger.log(`Post created successfully with ID ${post.id}`);

    return this.formatPostResponse(post);
  }

  /**
   * Lấy danh sách posts của một lớp học phần
   * Sinh viên chỉ xem posts của lớp mình đã đăng ký
   * GV xem posts của lớp mình dạy
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
      // Sinh viên chỉ xem được posts của lớp mình đã đăng ký
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
      // GV chỉ xem được posts của lớp mình dạy
      if (courseClass.lecturer.user_id.toString() !== userId.toString()) {
        throw new ForbiddenException('Bạn không dạy lớp này để xem thông báo');
      }
    }
    // ADMIN xem được tất cả

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { course_class_id: classId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar_url: true,
            },
          },
          media: true,
          _count: {
            select: {
              interactions: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: Math.min(take, 100), // Max 100
      }),
      this.prisma.post.count({
        where: { course_class_id: classId },
      }),
    ]);

    return {
      data: posts.map((p) => this.formatPostResponse(p)),
      total,
      skip,
      take: Math.min(take, 100),
    };
  }

  /**
   * Lấy chi tiết một bài post
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
        interactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Bài post với ID ${postId} không tồn tại`);
    }

    // Kiểm tra quyền xem
    if (userRole === Role.STUDENT && post.course_class) {
      const enrollment = await this.prisma.classEnrollment.findFirst({
        where: {
          course_class_id: post.course_class_id!,
          student: { user_id: BigInt(userId) },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'Bạn không được đăng ký lớp này để xem thông báo',
        );
      }
    } else if (userRole === Role.LECTURER && post.course_class) {
      if (post.course_class.lecturer.user_id.toString() !== userId.toString()) {
        throw new ForbiddenException('Bạn không dạy lớp này để xem thông báo');
      }
    }

    return this.formatPostResponse(post);
  }

  /**
   * Cập nhật bài post
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
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Bài post với ID ${postId} không tồn tại`);
    }

    // Kiểm tra quyền: Chỉ tác giả hoặc ADMIN
    if (
      userRole !== Role.ADMIN &&
      post.author_id.toString() !== userId.toString()
    ) {
      throw new ForbiddenException('Bạn không có quyền cập nhật bài post này');
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

  /**
   * Xóa bài post
   * Chỉ tác giả hoặc ADMIN mới có thể xóa
   */
  async deletePost(
    postId: number,
    userId: number,
    userRole: Role,
  ): Promise<any> {
    this.logger.log(`User ${userId} deleting post ${postId}`);

    const id = BigInt(postId);

    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Bài post với ID ${postId} không tồn tại`);
    }

    // Kiểm tra quyền: Chỉ tác giả hoặc ADMIN
    if (
      userRole !== Role.ADMIN &&
      post.author_id.toString() !== userId.toString()
    ) {
      throw new ForbiddenException('Bạn không có quyền xóa bài post này');
    }

    // Xóa media trước
    await this.prisma.postMedia.deleteMany({
      where: { post_id: id },
    });

    // Xóa interactions
    await this.prisma.postInteraction.deleteMany({
      where: { post_id: id },
    });

    // Xóa post
    await this.prisma.post.delete({
      where: { id },
    });

    this.logger.log(`Post ${postId} deleted successfully`);

    return { message: 'Bài post đã được xóa thành công' };
  }

  /**
   * Lấy posts do GV tạo
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
            },
          },
          media: true,
          _count: {
            select: {
              interactions: true,
            },
          },
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

  /**
   * Helper: Format response
   */
  private formatPostResponse(post: any): any {
    return {
      id: post.id.toString(),
      author: post.author,
      title: post.title,
      content: post.content,
      course_class_id: post.course_class_id?.toString() || null,
      media:
        post.media?.map((m: any) => ({
          id: m.id.toString(),
          file_url: m.file_url,
          file_type: m.file_type,
        })) || [],
      interactions_count: post._count?.interactions || 0,
      created_at: post.created_at,
      updated_at: post.updated_at,
    };
  }

  /**
   * Helper: Extract file type from URL
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
