import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  /**
   * Gửi tin nhắn và nhận câu trả lời RAG
   */
  async sendMessage(userId: bigint, dto: SendMessageDto) {
    // 1. Tạo hoặc lấy session
    let sessionId: bigint;
    if (dto.sessionId) {
      sessionId = BigInt(dto.sessionId);
      // Verify session thuộc về user
      const session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, user_id: userId },
      });
      if (!session) {
        throw new Error('Phiên chat không tồn tại hoặc không thuộc về bạn');
      }
    } else {
      // Tạo session mới
      const newSession = await this.prisma.chatSession.create({
        data: { user_id: userId, status: 1 },
      });
      sessionId = newSession.id;
    }

    // 2. Lưu tin nhắn của user
    await this.prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        sender_type: 'USER',
        message_content: dto.message,
      },
    });

    // 3. Tìm kiếm tài liệu liên quan (RAG retrieval)
    const relevantDocs = await this.knowledgeBaseService.searchRelevant(dto.message, 5);
    const context = relevantDocs.map((doc) => doc.content).join('\n\n');

    this.logger.debug(`Found ${relevantDocs.length} relevant chunks for query`);

    // 4. Lấy lịch sử chat gần nhất (tối đa 10 tin nhắn gần nhất)
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const chatHistory = recentMessages
      .reverse()
      .slice(0, -1) // bỏ tin nhắn vừa gửi (đã ở cuối)
      .map((msg) => ({
        role: msg.sender_type,
        content: msg.message_content || '',
      }));

    // 5. Gọi Gemini API để generate câu trả lời
    const answer = await this.geminiService.generateAnswer(dto.message, context, chatHistory);

    // 6. Lưu câu trả lời của bot
    const botMessage = await this.prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        sender_type: 'BOT',
        message_content: answer,
      },
    });

    return {
      sessionId: sessionId.toString(),
      message: {
        id: botMessage.id.toString(),
        sender_type: 'BOT',
        message_content: answer,
        created_at: botMessage.created_at,
      },
      sources: relevantDocs.length,
    };
  }

  /**
   * Lấy danh sách phiên chat của user
   */
  async getSessions(userId: bigint) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { user_id: userId },
      orderBy: { start_time: 'desc' },
      include: {
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            message_content: true,
            created_at: true,
          },
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id.toString(),
      start_time: session.start_time,
      end_time: session.end_time,
      status: session.status,
      last_message: session.messages[0]?.message_content || null,
      last_message_at: session.messages[0]?.created_at || session.start_time,
    }));
  }

  /**
   * Lấy tin nhắn trong 1 phiên chat
   */
  async getMessages(userId: bigint, sessionId: bigint) {
    // Verify session thuộc về user
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, user_id: userId },
    });
    if (!session) {
      throw new Error('Phiên chat không tồn tại hoặc không thuộc về bạn');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
    });

    return messages.map((msg) => ({
      id: msg.id.toString(),
      sender_type: msg.sender_type,
      message_content: msg.message_content,
      created_at: msg.created_at,
    }));
  }

  /**
   * Tạo phiên chat mới
   */
  async createSession(userId: bigint) {
    const session = await this.prisma.chatSession.create({
      data: { user_id: userId, status: 1 },
    });

    return {
      id: session.id.toString(),
      start_time: session.start_time,
      status: session.status,
    };
  }

  /**
   * Xóa phiên chat
   */
  async deleteSession(userId: bigint, sessionId: bigint) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, user_id: userId },
    });
    if (!session) {
      throw new Error('Phiên chat không tồn tại hoặc không thuộc về bạn');
    }

    // Xóa tất cả messages trước, rồi xóa session
    await this.prisma.chatMessage.deleteMany({
      where: { session_id: sessionId },
    });

    await this.prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return { message: 'Đã xóa phiên chat thành công' };
  }
}
