import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';

@Injectable()
export class AdminChatService {
  private readonly logger = new Logger(AdminChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  /**
   * Lấy danh sách chat giữa admin và sinh viên
   * Admin xem: danh sách sinh viên đã chat
   * Sinh viên xem: danh sách admin đã chat
   */
  async getAdminChats(userId: bigint, userRole: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        AND: [
          // User phải là thành viên của conversation
          {
            OR: [{ user_id_1: userId }, { user_id_2: userId }],
          },
          // Một bên ADMIN, bên kia STUDENT
          {
            OR: [
              {
                AND: [
                  { user1: { role: 'ADMIN' } },
                  { user2: { role: 'STUDENT' } },
                ],
              },
              {
                AND: [
                  { user1: { role: 'STUDENT' } },
                  { user2: { role: 'ADMIN' } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { last_message_at: { sort: 'desc', nulls: 'last' } },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            role: true,
            student: { select: { full_name: true, student_code: true } },
            lecturer: { select: { full_name: true, lecturer_code: true } },
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            role: true,
            student: { select: { full_name: true, student_code: true } },
            lecturer: { select: { full_name: true, lecturer_code: true } },
          },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          where: { is_deleted: false },
          select: {
            id: true,
            content: true,
            message_type: true,
            sender_id: true,
            created_at: true,
          },
        },
      },
    });

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.directMessage.count({
          where: {
            conversation_id: conv.id,
            sender_id: { not: userId },
            is_read: false,
            is_deleted: false,
          },
        });

        const partner = conv.user_id_1 === userId ? conv.user2 : conv.user1;
        const partnerName =
          partner.student?.full_name ||
          partner.lecturer?.full_name ||
          partner.username;
        const partnerCode =
          partner.student?.student_code ||
          partner.lecturer?.lecturer_code ||
          null;

        const lastMessage = conv.messages[0] || null;

        return {
          id: conv.id.toString(),
          partner: {
            id: partner.id.toString(),
            username: partner.username,
            fullName: partnerName,
            code: partnerCode,
            avatarUrl: partner.avatar_url,
            role: partner.role,
          },
          lastMessage: lastMessage
            ? {
                id: lastMessage.id.toString(),
                content: lastMessage.content,
                messageType: lastMessage.message_type,
                senderId: lastMessage.sender_id.toString(),
                isMe: lastMessage.sender_id === userId,
                createdAt: lastMessage.created_at,
              }
            : null,
          unreadCount,
          lastMessageAt: conv.last_message_at,
        };
      }),
    );

    return result;
  }

  /**
   * Tạo hoặc lấy chat giữa admin và sinh viên
   * Kiểm tra: một bên ADMIN, bên kia STUDENT
   */
  async getOrCreateAdminChat(
    userId: bigint,
    userRole: string,
    targetUserId: bigint,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException('Không thể tạo hội thoại với chính mình');
    }

    // Lấy thông tin target user
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        avatar_url: true,
        role: true,
        student: { select: { full_name: true, student_code: true } },
        lecturer: { select: { full_name: true, lecturer_code: true } },
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Kiểm tra: một bên phải là ADMIN, bên kia là STUDENT
    const isValidPair =
      (userRole === 'ADMIN' && targetUser.role === 'STUDENT') ||
      (userRole === 'STUDENT' && targetUser.role === 'ADMIN');

    if (!isValidPair) {
      throw new ForbiddenException(
        'Chat chỉ được phép giữa Admin và Sinh viên',
      );
    }

    // Đảm bảo user_id_1 < user_id_2
    const [id1, id2] =
      userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];

    let conversation = await this.prisma.conversation.findUnique({
      where: {
        user_id_1_user_id_2: { user_id_1: id1, user_id_2: id2 },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { user_id_1: id1, user_id_2: id2 },
      });
      this.logger.log(
        `Created new admin-chat conversation ${conversation.id} between users ${id1} and ${id2}`,
      );
    }

    const partnerName =
      targetUser.student?.full_name ||
      targetUser.lecturer?.full_name ||
      targetUser.username;
    const partnerCode =
      targetUser.student?.student_code ||
      targetUser.lecturer?.lecturer_code ||
      null;

    return {
      id: conversation.id.toString(),
      partner: {
        id: targetUser.id.toString(),
        username: targetUser.username,
        fullName: partnerName,
        code: partnerCode,
        avatarUrl: targetUser.avatar_url,
        role: targetUser.role,
      },
      lastMessageAt: conversation.last_message_at,
    };
  }

  /**
   * Lấy tin nhắn trong hội thoại admin-student
   */
  async getMessages(
    userId: bigint,
    userRole: string,
    conversationId: bigint,
    cursor?: string,
    limit: number = 30,
  ) {
    // Verify conversation exists và user là thành viên
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user_id_1: userId }, { user_id_2: userId }],
      },
      include: {
        user1: { select: { role: true } },
        user2: { select: { role: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        'Hội thoại không tồn tại hoặc bạn không có quyền truy cập',
      );
    }

    // Verify: một bên ADMIN, bên kia STUDENT
    const isValidConversation =
      (conversation.user1.role === 'ADMIN' &&
        conversation.user2.role === 'STUDENT') ||
      (conversation.user1.role === 'STUDENT' &&
        conversation.user2.role === 'ADMIN');

    if (!isValidConversation) {
      throw new ForbiddenException(
        'Hội thoại này không phải là hội thoại admin-student',
      );
    }

    // Build query
    const whereClause: any = {
      conversation_id: conversationId,
      is_deleted: false,
    };

    if (cursor) {
      whereClause.id = { lt: BigInt(cursor) };
    }

    const messages = await this.prisma.directMessage.findMany({
      where: whereClause,
      orderBy: { id: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            role: true,
            student: { select: { full_name: true } },
            lecturer: { select: { full_name: true } },
          },
        },
      },
    });

    // Cập nhật is_read cho tin nhắn của người khác
    await this.prisma.directMessage.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: userId },
        is_read: false,
      },
      data: { is_read: true },
    });

    const hasMore = messages.length === limit;
    const nextCursor =
      messages.length > 0 ? messages[messages.length - 1].id.toString() : null;

    return {
      messages: messages.reverse().map((msg) => {
        const senderName =
          msg.sender.student?.full_name ||
          msg.sender.lecturer?.full_name ||
          msg.sender.username;

        return {
          id: msg.id.toString(),
          conversationId: msg.conversation_id.toString(),
          senderId: msg.sender_id.toString(),
          senderName,
          senderAvatar: msg.sender.avatar_url,
          senderRole: msg.sender.role,
          content: msg.content,
          messageType: msg.message_type,
          mediaUrl: msg.media_url,
          isRead: msg.is_read,
          isMe: msg.sender_id === userId,
          createdAt: msg.created_at,
        };
      }),
      hasMore,
      nextCursor,
    };
  }

  /**
   * Gửi tin nhắn
   */
  async sendMessage(
    userId: bigint,
    conversationId: bigint,
    content: string,
    messageType: string = 'TEXT',
    mediaUrl?: string,
  ) {
    // Verify conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user_id_1: userId }, { user_id_2: userId }],
      },
      include: {
        user1: { select: { role: true } },
        user2: { select: { role: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        'Hội thoại không tồn tại hoặc bạn không có quyền truy cập',
      );
    }

    // Verify: một bên ADMIN, bên kia STUDENT
    const isValidConversation =
      (conversation.user1.role === 'ADMIN' &&
        conversation.user2.role === 'STUDENT') ||
      (conversation.user1.role === 'STUDENT' &&
        conversation.user2.role === 'ADMIN');

    if (!isValidConversation) {
      throw new ForbiddenException(
        'Hội thoại này không phải là hội thoại admin-student',
      );
    }

    // Tạo tin nhắn
    const message = await this.prisma.directMessage.create({
      data: {
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: messageType,
        media_url: mediaUrl,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            role: true,
            student: { select: { full_name: true } },
            lecturer: { select: { full_name: true } },
          },
        },
      },
    });

    // Cập nhật last_message_at của conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { last_message_at: new Date() },
    });

    const senderName =
      message.sender.student?.full_name ||
      message.sender.lecturer?.full_name ||
      message.sender.username;

    return {
      id: message.id.toString(),
      conversationId: message.conversation_id.toString(),
      senderId: message.sender_id.toString(),
      senderName,
      senderAvatar: message.sender.avatar_url,
      senderRole: message.sender.role,
      content: message.content,
      messageType: message.message_type,
      mediaUrl: message.media_url,
      isRead: message.is_read,
      createdAt: message.created_at,
    };
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  async markMessagesAsRead(userId: bigint, conversationId: bigint) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user_id_1: userId }, { user_id_2: userId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Hội thoại không tồn tại');
    }

    const result = await this.prisma.directMessage.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: userId },
        is_read: false,
      },
      data: { is_read: true },
    });

    return {
      updatedCount: result.count,
    };
  }

  /**
   * Lấy số tin nhắn chưa đọc của user
   */
  async getUnreadCount(userId: bigint, userRole: string) {
    // Lấy tất cả conversations liên quan
    const conversations = await this.prisma.conversation.findMany({
      where: {
        AND: [
          // User phải là thành viên của conversation
          {
            OR: [{ user_id_1: userId }, { user_id_2: userId }],
          },
          // Một bên ADMIN, bên kia STUDENT
          {
            OR: [
              {
                AND: [
                  { user1: { role: 'ADMIN' } },
                  { user2: { role: 'STUDENT' } },
                ],
              },
              {
                AND: [
                  { user1: { role: 'STUDENT' } },
                  { user2: { role: 'ADMIN' } },
                ],
              },
            ],
          },
        ],
      },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    if (conversationIds.length === 0) {
      return { totalUnread: 0 };
    }

    const totalUnread = await this.prisma.directMessage.count({
      where: {
        conversation_id: { in: conversationIds },
        sender_id: { not: userId },
        is_read: false,
        is_deleted: false,
      },
    });

    return { totalUnread };
  }

  /**
   * Gửi notification và FCM khi có tin nhắn mới
   */
  async sendMessageNotification(
    senderUserId: bigint,
    senderRole: string,
    recipientUserId: bigint,
    messageId: bigint,
    content: string,
    messageType: string = 'TEXT',
  ) {
    try {
      // Lấy thông tin người gửi
      const sender = await this.prisma.user.findUnique({
        where: { id: senderUserId },
        select: {
          username: true,
          student: { select: { full_name: true } },
          lecturer: { select: { full_name: true } },
        },
      });

      if (!sender) {
        this.logger.warn(
          `Sender user ${senderUserId} not found for notification`,
        );
        return;
      }

      const senderName =
        sender.student?.full_name ||
        sender.lecturer?.full_name ||
        sender.username;

      const notificationTitle =
        senderRole === 'ADMIN'
          ? `Tin nhắn từ ${senderName}`
          : `${senderName} đã gửi tin nhắn`;

      const notificationBody =
        messageType === 'TEXT' ? content.substring(0, 100) : `[${messageType}]`;

      // Tạo notification record
      await this.prisma.notification.create({
        data: {
          user_id: recipientUserId,
          title: notificationTitle,
          message: notificationBody,
          notification_type: 'ADMIN_CHAT',
          source_id: messageId,
          is_read: false,
          fcm_sent: false,
        },
      });

      // Gửi FCM notification (async)
      this.fcmService
        .sendToUser(
          Number(recipientUserId),
          notificationTitle,
          notificationBody,
          {
            conversationId: messageId.toString(),
            messageId: messageId.toString(),
            senderId: senderUserId.toString(),
            type: 'admin_chat',
          },
        )
        .then((res) => {
          if (res.successCount > 0) {
            // Cập nhật fcm_sent flag
            this.prisma.notification
              .updateMany({
                where: {
                  user_id: recipientUserId,
                  source_id: messageId,
                },
                data: { fcm_sent: true },
              })
              .catch((err: any) =>
                this.logger.error(
                  `Failed to update fcm_sent flag: ${err.message}`,
                ),
              );

            this.logger.log(
              `FCM notification sent to user ${recipientUserId} for message ${messageId}`,
            );
          }
        })
        .catch((err: any) => {
          this.logger.error(`Failed to send FCM notification: ${err.message}`);
        });
    } catch (error: any) {
      this.logger.error(
        `Failed to send message notification: ${error.message}`,
      );
    }
  }

  /**
   * Tìm kiếm sinh viên (dành cho admin)
   */
  async searchStudents(query: string, limit: number = 20) {
    const students = await this.prisma.student.findMany({
      where: {
        OR: [
          { full_name: { contains: query, mode: 'insensitive' } },
          { student_code: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        user_id: true,
        full_name: true,
        student_code: true,
        email: true,
        class_name: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            role: true,
          },
        },
      },
      take: limit,
      orderBy: { full_name: 'asc' },
    });

    return students.map((student) => ({
      userId: student.user_id.toString(),
      studentId: student.id.toString(),
      fullName: student.full_name,
      studentCode: student.student_code,
      email: student.email,
      className: student.class_name,
      username: student.user.username,
      avatarUrl: student.user.avatar_url,
      role: student.user.role,
    }));
  }
}
