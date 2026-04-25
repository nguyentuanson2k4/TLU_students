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
import { MessagingService } from './messaging.service';
import { FcmService } from '../fcm/fcm.service';

@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: '*',
  },
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  // Map: userId (string) → Set of socket IDs (hỗ trợ nhiều device)
  private onlineUsers = new Map<string, Set<string>>();
  // Map: socketId → userId (để lookup khi disconnect)
  private socketToUser = new Map<string, string>();

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly fcmService: FcmService,
  ) {}

  // ===================== CONNECTION LIFECYCLE =====================

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Client cần gửi event 'authenticate' sau khi connect
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
          // Broadcast user offline cho tất cả connected clients
          this.server.emit('userOffline', {
            userId,
            timestamp: new Date().toISOString(),
          });
          this.logger.log(`User ${userId} is now offline`);
        }
      }
      this.socketToUser.delete(client.id);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ===================== AUTHENTICATION =====================

  /**
   * Xác thực socket connection bằng JWT token
   * Client gửi: socket.emit('authenticate', { token: 'Bearer xxx' })
   */
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

      // Lưu mapping
      this.socketToUser.set(client.id, userId);
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
        // Broadcast user online
        this.server.emit('userOnline', {
          userId,
          timestamp: new Date().toISOString(),
        });
        this.logger.log(`User ${userId} is now online`);
      }
      this.onlineUsers.get(userId)!.add(client.id);

      // Join vào room riêng của user để nhận tin nhắn
      client.join(`user_${userId}`);

      client.emit('authenticated', {
        userId,
        message: 'Xác thực thành công',
      });

      // Gửi số tin chưa đọc
      const { totalUnread } = await this.messagingService.getUnreadCount(
        BigInt(userId),
      );
      client.emit('unreadCount', { totalUnread });

      this.logger.log(`User ${userId} authenticated (socket: ${client.id})`);
    } catch (error) {
      client.emit('authError', { message: 'Token không hợp lệ hoặc hết hạn' });
      this.logger.warn(`Authentication failed for socket ${client.id}: ${error.message}`);
    }
  }

  // ===================== MESSAGING EVENTS =====================

  /**
   * Gửi tin nhắn
   * Client gửi: socket.emit('sendMessage', { conversationId, content, messageType?, mediaUrl? })
   */
  @SubscribeMessage('sendMessage')
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
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      client.emit('error', { message: 'Chưa xác thực' });
      return;
    }

    try {
      const result = await this.messagingService.sendMessage(
        BigInt(userId),
        BigInt(data.conversationId),
        data.content,
        data.messageType || 'TEXT',
        data.mediaUrl,
      );

      const receiverId = result.receiverId;

      // Gửi tin nhắn cho sender (confirm)
      client.emit('messageSent', {
        ...result.message,
        isMe: true,
      });

      // Kiểm tra người nhận online hay không
      if (this.onlineUsers.has(receiverId)) {
        // Online → emit trực tiếp qua socket
        this.server.to(`user_${receiverId}`).emit('newMessage', {
          ...result.message,
          isMe: false,
        });

        // Cập nhật unread count cho receiver
        const { totalUnread } = await this.messagingService.getUnreadCount(
          BigInt(receiverId),
        );
        this.server.to(`user_${receiverId}`).emit('unreadCount', { totalUnread });
      } else {
        // Offline → gửi FCM push notification
        try {
          await this.fcmService.sendToUser(
            Number(receiverId),
            result.message.senderName || 'Tin nhắn mới',
            data.content.length > 100
              ? data.content.substring(0, 100) + '...'
              : data.content,
            {
              type: 'DIRECT_MESSAGE',
              conversationId: data.conversationId,
              senderId: userId,
              senderName: result.message.senderName || '',
            },
          );
          this.logger.debug(
            `Sent FCM notification to offline user ${receiverId}`,
          );
        } catch (fcmError) {
          this.logger.warn(`Failed to send FCM to user ${receiverId}: ${fcmError.message}`);
        }
      }
    } catch (error) {
      client.emit('error', { message: error.message || 'Lỗi gửi tin nhắn' });
      this.logger.error(`Error sending message: ${error.message}`);
    }
  }

  /**
   * Join vào room của conversation
   * Client gửi: socket.emit('joinConversation', { conversationId: '1' })
   */
  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    const room = `conversation_${data.conversationId}`;
    client.join(room);
    this.logger.debug(`User ${userId} joined ${room}`);
  }

  /**
   * Leave room của conversation
   * Client gửi: socket.emit('leaveConversation', { conversationId: '1' })
   */
  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    const room = `conversation_${data.conversationId}`;
    client.leave(room);
    this.logger.debug(`User ${userId} left ${room}`);
  }

  // ===================== TYPING INDICATOR =====================

  /**
   * Báo đang gõ
   * Client gửi: socket.emit('typing', { conversationId: '1' })
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    const room = `conversation_${data.conversationId}`;
    client.to(room).emit('userTyping', {
      conversationId: data.conversationId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Ngừng gõ
   * Client gửi: socket.emit('stopTyping', { conversationId: '1' })
   */
  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    const room = `conversation_${data.conversationId}`;
    client.to(room).emit('userStopTyping', {
      conversationId: data.conversationId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  // ===================== READ RECEIPTS =====================

  /**
   * Đánh dấu đã đọc
   * Client gửi: socket.emit('markAsRead', { conversationId: '1' })
   */
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    try {
      const result = await this.messagingService.markAsRead(
        BigInt(userId),
        BigInt(data.conversationId),
      );

      // Thông báo cho người gửi rằng tin nhắn đã được đọc
      if (this.onlineUsers.has(result.senderId)) {
        this.server.to(`user_${result.senderId}`).emit('messagesRead', {
          conversationId: data.conversationId,
          readBy: userId,
          readCount: result.readCount,
          timestamp: new Date().toISOString(),
        });
      }

      // Cập nhật unread count cho chính người đọc
      const { totalUnread } = await this.messagingService.getUnreadCount(
        BigInt(userId),
      );
      client.emit('unreadCount', { totalUnread });
    } catch (error) {
      this.logger.error(`Error marking as read: ${error.message}`);
    }
  }

  // ===================== UTILITY =====================

  /**
   * Lấy danh sách user đang online
   * Client gửi: socket.emit('getOnlineUsers')
   */
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    const onlineUserIds = Array.from(this.onlineUsers.keys());
    client.emit('onlineUsers', { userIds: onlineUserIds });
  }

  /**
   * Kiểm tra user có online không (dùng nội bộ)
   */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
