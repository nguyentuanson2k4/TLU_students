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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<bigint, Socket> = new Map();

  constructor(private readonly jwtService: JwtService) {}

  // ===================== CONNECTION MANAGEMENT =====================

  handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // Lấy userId từ token trong handshake
      const token = client.handshake.auth.token;
      if (!token) {
        this.logger.warn(`Client connected without token: ${client.id}`);
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = BigInt(decoded.sub);

      // Lưu socket connection của user
      this.userSockets.set(userId, client);

      // Join room notifications-{userId}
      client.join(`notifications-${userId}`);

      this.logger.log(
        `User ${userId} connected to notifications namespace. Socket: ${client.id}`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    // Tìm userId từ userSockets map
    let userId: bigint | null = null;
    for (const [id, socket] of this.userSockets.entries()) {
      if (socket.id === client.id) {
        userId = id;
        this.userSockets.delete(id);
        break;
      }
    }

    if (userId) {
      client.leave(`notifications-${userId}`);
      this.logger.log(`User ${userId} disconnected from notifications`);
    }
  }

  // ===================== SUBSCRIPTION EVENTS =====================

  /**
   * Client gửi event để đánh dấu notification đã đọc
   */
  @SubscribeMessage('mark-notification-as-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: bigint },
  ) {
    try {
      const token = client.handshake.auth.token;
      const decoded = this.jwtService.verify(token);
      const userId = BigInt(decoded.sub);

      // Broadcast event để cập nhật UI
      this.server.to(`notifications-${userId}`).emit('notification-updated', {
        notificationId: data.notificationId,
        is_read: true,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Notification ${data.notificationId} marked as read for user ${userId}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Mark as read error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Client gửi event để lấy count thông báo chưa đọc
   */
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {},
  ) {
    try {
      const token = client.handshake.auth.token;
      const decoded = this.jwtService.verify(token);
      const userId = BigInt(decoded.sub);

      // Emit response về phía client
      return { success: true, userId: userId.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===================== SERVER-SIDE METHODS (Call từ Service) =====================

  /**
   * Gửi notification mới cho user/group realtime
   * Call từ NotificationsService.sendNotification()
   */
  notifyNewNotification(
    userIds: bigint[],
    notification: {
      id: bigint;
      title: string;
      message: string;
      notification_type: string;
      source_id?: bigint;
      created_at: Date;
    },
  ) {
    userIds.forEach((userId) => {
      // Emit để online users
      this.server.to(`notifications-${userId}`).emit('new-notification', {
        id: notification.id.toString(),
        title: notification.title,
        message: notification.message,
        notification_type: notification.notification_type,
        source_id: notification.source_id?.toString() || null,
        created_at: notification.created_at,
        is_read: false,
      });
    });

    this.logger.log(`Sent ${userIds.length} new notifications via WebSocket`);
  }

  /**
   * Update unread count badge realtime
   */
  updateUnreadBadge(userId: bigint, unreadCount: number) {
    this.server.to(`notifications-${userId}`).emit('unread-badge-updated', {
      unreadCount,
      timestamp: new Date(),
    });

    this.logger.debug(`Updated badge for user ${userId}: ${unreadCount}`);
  }

  /**
   * Notify notification deleted
   */
  notifyNotificationDeleted(userId: bigint, notificationId: bigint) {
    this.server.to(`notifications-${userId}`).emit('notification-deleted', {
      notificationId: notificationId.toString(),
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast event cho tất cả users
   */
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted event: ${event}`);
  }

  /**
   * Gửi event cho specific user
   */
  sendToUser(userId: bigint, event: string, data: any) {
    this.server.to(`notifications-${userId}`).emit(event, data);
  }

  /**
   * Kiểm tra user có online không
   */
  isUserOnline(userId: bigint): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Lấy danh sách users online
   */
  getOnlineUsers(): bigint[] {
    return Array.from(this.userSockets.keys());
  }
}
