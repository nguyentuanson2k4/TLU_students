import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===================== CONVERSATIONS =====================

  /**
   * Lấy danh sách hội thoại của user, sắp xếp theo tin nhắn gần nhất
   */
  async getConversations(userId: bigint) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ user_id_1: userId }, { user_id_2: userId }],
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

    // Tính unread count cho mỗi conversation
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
          partner.student?.student_code || partner.lecturer?.lecturer_code || null;

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
   * Tạo hoặc lấy conversation giữa 2 user
   */
  async getOrCreateConversation(userId: bigint, targetUserId: bigint) {
    if (userId === targetUserId) {
      throw new BadRequestException('Không thể tạo hội thoại với chính mình');
    }

    // Kiểm tra user target có tồn tại
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

    // Đảm bảo user_id_1 < user_id_2 để tránh duplicate
    const [id1, id2] =
      userId < targetUserId
        ? [userId, targetUserId]
        : [targetUserId, userId];

    // Tìm hoặc tạo conversation
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
        `Created new conversation ${conversation.id} between users ${id1} and ${id2}`,
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

  // ===================== MESSAGES =====================

  /**
   * Lấy tin nhắn của conversation với cursor-based pagination
   */
  async getMessages(
    userId: bigint,
    conversationId: bigint,
    cursor?: string,
    limit: number = 30,
  ) {
    // Verify user thuộc conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user_id_1: userId }, { user_id_2: userId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Hội thoại không tồn tại hoặc bạn không có quyền truy cập');
    }

    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversation_id: conversationId,
        is_deleted: false,
        ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit + 1, // Lấy thêm 1 để biết còn tin nhắn cũ hơn không
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            student: { select: { full_name: true } },
            lecturer: { select: { full_name: true } },
          },
        },
      },
    });

    const hasMore = messages.length > limit;
    const data = (hasMore ? messages.slice(0, limit) : messages).reverse();

    return {
      messages: data.map((msg) => ({
        id: msg.id.toString(),
        conversationId: msg.conversation_id.toString(),
        senderId: msg.sender_id.toString(),
        senderName:
          msg.sender.student?.full_name ||
          msg.sender.lecturer?.full_name ||
          msg.sender.username,
        senderAvatar: msg.sender.avatar_url,
        content: msg.content,
        messageType: msg.message_type,
        mediaUrl: msg.media_url,
        isRead: msg.is_read,
        isMe: msg.sender_id === userId,
        createdAt: msg.created_at,
      })),
      hasMore,
      nextCursor: hasMore ? data[0]?.id.toString() : null,
    };
  }

  /**
   * Gửi tin nhắn mới
   */
  async sendMessage(
    senderId: bigint,
    conversationId: bigint,
    content: string,
    messageType: string = 'TEXT',
    mediaUrl?: string,
  ) {
    // Verify user thuộc conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user_id_1: senderId }, { user_id_2: senderId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Hội thoại không tồn tại hoặc bạn không có quyền gửi tin nhắn');
    }

    // Tạo tin nhắn + cập nhật last_message_at trong transaction
    const [message] = await this.prisma.$transaction([
      this.prisma.directMessage.create({
        data: {
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: messageType,
          media_url: mediaUrl || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar_url: true,
              student: { select: { full_name: true } },
              lecturer: { select: { full_name: true } },
            },
          },
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { last_message_at: new Date() },
      }),
    ]);

    // Xác định người nhận
    const receiverId =
      conversation.user_id_1 === senderId
        ? conversation.user_id_2
        : conversation.user_id_1;

    const senderName =
      message.sender.student?.full_name ||
      message.sender.lecturer?.full_name ||
      message.sender.username;

    return {
      message: {
        id: message.id.toString(),
        conversationId: message.conversation_id.toString(),
        senderId: message.sender_id.toString(),
        senderName,
        senderAvatar: message.sender.avatar_url,
        content: message.content,
        messageType: message.message_type,
        mediaUrl: message.media_url,
        isRead: message.is_read,
        createdAt: message.created_at,
      },
      receiverId: receiverId.toString(),
      receiverIdBigInt: receiverId,
    };
  }

  /**
   * Đánh dấu tất cả tin nhắn chưa đọc trong conversation là đã đọc
   */
  async markAsRead(userId: bigint, conversationId: bigint) {
    // Verify user thuộc conversation
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
        sender_id: { not: userId }, // Chỉ đánh dấu tin nhắn của người kia
        is_read: false,
      },
      data: { is_read: true },
    });

    this.logger.debug(
      `Marked ${result.count} messages as read in conversation ${conversationId}`,
    );

    // Xác định người gửi (để thông báo cho họ biết tin nhắn đã đọc)
    const senderId =
      conversation.user_id_1 === userId
        ? conversation.user_id_2
        : conversation.user_id_1;

    return {
      conversationId: conversationId.toString(),
      readCount: result.count,
      readBy: userId.toString(),
      senderId: senderId.toString(),
    };
  }

  /**
   * Đếm tổng tin nhắn chưa đọc của user
   */
  async getUnreadCount(userId: bigint) {
    // Lấy tất cả conversation IDs của user
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ user_id_1: userId }, { user_id_2: userId }],
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
   * Thu hồi tin nhắn (soft delete)
   */
  async deleteMessage(userId: bigint, messageId: bigint) {
    const message = await this.prisma.directMessage.findFirst({
      where: { id: messageId, sender_id: userId },
    });

    if (!message) {
      throw new NotFoundException(
        'Tin nhắn không tồn tại hoặc bạn không có quyền thu hồi',
      );
    }

    await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { is_deleted: true },
    });

    return {
      messageId: messageId.toString(),
      conversationId: message.conversation_id.toString(),
      message: 'Đã thu hồi tin nhắn',
    };
  }

  /**
   * Tìm kiếm user để bắt đầu chat
   */
  async searchUsers(query: string, currentUserId: bigint) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();

    // Tìm trong cả Student và Lecturer
    const [students, lecturers] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          user: { id: { not: currentUserId }, is_active: true },
          OR: [
            { full_name: { contains: searchTerm, mode: 'insensitive' } },
            { student_code: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          user_id: true,
          full_name: true,
          student_code: true,
          class_name: true,
          user: {
            select: { avatar_url: true, role: true },
          },
        },
      }),
      this.prisma.lecturer.findMany({
        where: {
          user: { id: { not: currentUserId }, is_active: true },
          OR: [
            { full_name: { contains: searchTerm, mode: 'insensitive' } },
            { lecturer_code: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          user_id: true,
          full_name: true,
          lecturer_code: true,
          department: true,
          user: {
            select: { avatar_url: true, role: true },
          },
        },
      }),
    ]);

    const results = [
      ...students.map((s) => ({
        userId: s.user_id.toString(),
        fullName: s.full_name,
        code: s.student_code,
        subtitle: s.class_name,
        avatarUrl: s.user.avatar_url,
        role: s.user.role,
      })),
      ...lecturers.map((l) => ({
        userId: l.user_id.toString(),
        fullName: l.full_name,
        code: l.lecturer_code,
        subtitle: l.department,
        avatarUrl: l.user.avatar_url,
        role: l.user.role,
      })),
    ];

    return results;
  }
}
