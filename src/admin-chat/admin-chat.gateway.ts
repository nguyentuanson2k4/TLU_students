import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminChatService } from './admin-chat.service';
import { FcmService } from '../fcm/fcm.service';

@WebSocketGateway({
  namespace: '/admin-chat',
  cors: {
    origin: '*',
  },
})
export class AdminChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminChatGateway.name);

  // Map: userId (string) → Set of socket IDs
  private onlineUsers = new Map<string, Set<string>>();
  // Map: socketId → { userId, userRole }
  private socketToUser = new Map<
    string,
    { userId: string; userRole: string }
  >();

  constructor(
    private readonly adminChatService: AdminChatService,
    private readonly jwtService: JwtService,
    private readonly fcmService: FcmService,
  ) {}

  // ===================== CONNECTION LIFECYCLE =====================

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to admin-chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.socketToUser.get(client.id);
    if (userInfo) {
      const { userId } = userInfo;
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
          this.server.emit('adminChatUserOffline', {
            userId,
            timestamp: new Date().toISOString(),
          });
          this.logger.log(`Admin-chat user ${userId} is now offline`);
        }
      }
      this.socketToUser.delete(client.id);
    }
    this.logger.log(`Client disconnected from admin-chat: ${client.id}`);
  }

  // ===================== AUTHENTICATION =====================

  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    try {
      const token = data.token?.replace('Bearer ', '');
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'defaultSecretKey',
      });

      const userId = String(payload.sub);
      const userRole = payload.role || 'STUDENT';

      // Verify: chỉ ADMIN hoặc STUDENT mới được connect
      if (!['ADMIN', 'STUDENT'].includes(userRole)) {
        client.emit('authError', {
          message: 'Chỉ Admin và Sinh viên mới được sử dụng admin-chat',
        });
        return;
      }

      this.socketToUser.set(client.id, { userId, userRole });

      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
        this.server.emit('adminChatUserOnline', {
          userId,
          userRole,
          timestamp: new Date().toISOString(),
        });
        this.logger.log(
          `Admin-chat user ${userId} (${userRole}) is now online`,
        );
      }
      this.onlineUsers.get(userId)!.add(client.id);

      client.join(`admin_chat_user_${userId}`);

      client.emit('authenticated', {
        userId,
        userRole,
        message: 'Xác thực thành công',
      });

      const { totalUnread } = await this.adminChatService.getUnreadCount(
        BigInt(userId),
        userRole,
      );
      client.emit('unreadCount', { totalUnread });

      this.logger.log(
        `Admin-chat user ${userId} (${userRole}) authenticated (socket: ${client.id})`,
      );
    } catch (error) {
      client.emit('authError', {
        message: 'Token không hợp lệ hoặc hết hạn',
      });
      this.logger.warn(
        `Admin-chat authentication failed for socket ${client.id}: ${error.message}`,
      );
    }
  }

  // ===================== MESSAGING EVENTS =====================

  @SubscribeMessage('sendAdminMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      messageType?: string;
      mediaUrl?: string;
    },
  ) {
    const userInfo = this.socketToUser.get(client.id);
    if (!userInfo) {
      client.emit('error', { message: 'Chưa xác thực' });
      return;
    }

    try {
      const { userId, userRole } = userInfo;
      const result = await this.adminChatService.sendMessage(
        BigInt(userId),
        BigInt(data.conversationId),
        data.content,
        data.messageType || 'TEXT',
        data.mediaUrl,
      );

      // Lấy thông tin conversation để biết người nhận
      const conversation = await (
        this as any
      ).adminChatService.prisma.conversation.findUnique({
        where: { id: BigInt(data.conversationId) },
      });

      if (conversation) {
        const recipientId =
          conversation.user_id_1 === BigInt(userId)
            ? conversation.user_id_2
            : conversation.user_id_1;

        // Emit tới người nhận
        this.server
          .to(`admin_chat_user_${recipientId}`)
          .emit('receiveAdminMessage', result);

        // Emit tới người gửi (để confirm)
        client.emit('messageSent', result);
      }

      this.logger.log(
        `Message sent in admin-chat ${data.conversationId} by user ${userId}`,
      );
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Gửi tin nhắn thất bại',
      });
      this.logger.error(`Failed to send admin-chat message: ${error.message}`);
    }
  }

  @SubscribeMessage('markAdminMessageAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userInfo = this.socketToUser.get(client.id);
    if (!userInfo) {
      client.emit('error', { message: 'Chưa xác thực' });
      return;
    }

    try {
      const { userId } = userInfo;
      const result = await this.adminChatService.markMessagesAsRead(
        BigInt(userId),
        BigInt(data.conversationId),
      );

      client.emit('messagesMarkedAsRead', {
        conversationId: data.conversationId,
        ...result,
      });

      this.logger.log(
        `Messages marked as read in admin-chat ${data.conversationId} by user ${userId}`,
      );
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Đánh dấu đã đọc thất bại',
      });
    }
  }

  @SubscribeMessage('getAdminChatUnreadCount')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const userInfo = this.socketToUser.get(client.id);
    if (!userInfo) {
      client.emit('error', { message: 'Chưa xác thực' });
      return;
    }

    try {
      const { userId, userRole } = userInfo;
      const result = await this.adminChatService.getUnreadCount(
        BigInt(userId),
        userRole,
      );

      client.emit('unreadCount', result);
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Lấy số tin chưa đọc thất bại',
      });
    }
  }

  @SubscribeMessage('adminChatUserTyping')
  async handleUserTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const userInfo = this.socketToUser.get(client.id);
    if (!userInfo) return;

    try {
      const { userId } = userInfo;

      // Emit tới conversation room
      this.server
        .to(`admin_chat_conversation_${data.conversationId}`)
        .emit('userTyping', {
          userId,
          conversationId: data.conversationId,
          isTyping: data.isTyping,
        });
    } catch (error) {
      this.logger.error(`Typing event failed: ${error.message}`);
    }
  }

  // ===================== HELPER METHODS =====================

  /**
   * Kiểm tra user có đang online không
   */
  isUserOnline(userId: string): boolean {
    return (
      this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0
    );
  }

  /**
   * Lấy số socket của user
   */
  getUserSocketCount(userId: string): number {
    return this.onlineUsers.get(userId)?.size || 0;
  }
}
