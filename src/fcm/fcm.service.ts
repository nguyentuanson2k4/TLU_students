import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  onModuleInit() {
    if (admin.apps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase credentials not found in env. FCM push notifications will be disabled.',
        );
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra Firebase đã được khởi tạo chưa
   */
  private isFirebaseInitialized(): boolean {
    return admin.apps.length > 0;
  }

  // ===================== TOKEN MANAGEMENT =====================

  /**
   * Đăng ký FCM token cho user (khi login hoặc mở app)
   */
  async registerToken(
    userId: number,
    token: string,
    deviceName?: string,
    platform?: string,
  ): Promise<{ message: string }> {
    const userIdBi = BigInt(userId);

    // Upsert: nếu token đã tồn tại cho user → cập nhật, nếu chưa → tạo mới
    await this.prisma.fcmToken.upsert({
      where: {
        user_id_token: {
          user_id: userIdBi,
          token,
        },
      },
      update: {
        device_name: deviceName,
        platform,
        is_active: true,
        updated_at: new Date(),
      },
      create: {
        user_id: userIdBi,
        token,
        device_name: deviceName,
        platform,
        is_active: true,
      },
    });

    this.logger.log(
      `FCM token registered for user ${userId} (${platform || 'unknown'})`,
    );

    return { message: 'FCM token đã được đăng ký thành công' };
  }

  /**
   * Hủy đăng ký FCM token (khi logout)
   */
  async unregisterToken(
    userId: number,
    token: string,
  ): Promise<{ message: string }> {
    const userIdBi = BigInt(userId);

    await this.prisma.fcmToken.updateMany({
      where: {
        user_id: userIdBi,
        token,
      },
      data: {
        is_active: false,
      },
    });

    this.logger.log(`FCM token unregistered for user ${userId}`);

    return { message: 'FCM token đã được hủy đăng ký thành công' };
  }

  /**
   * Hủy tất cả token của user (khi đổi mật khẩu, bị ban, etc.)
   */
  async unregisterAllTokens(userId: number): Promise<{ count: number }> {
    const userIdBi = BigInt(userId);

    const result = await this.prisma.fcmToken.updateMany({
      where: {
        user_id: userIdBi,
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    this.logger.log(
      `All FCM tokens (${result.count}) deactivated for user ${userId}`,
    );

    return { count: result.count };
  }

  /**
   * Lấy danh sách token đang active của user
   */
  async getActiveTokens(userId: number): Promise<string[]> {
    const userIdBi = BigInt(userId);

    const tokens = await this.prisma.fcmToken.findMany({
      where: {
        user_id: userIdBi,
        is_active: true,
      },
      select: { token: true },
    });

    return tokens.map((t) => t.token);
  }

  /**
   * Lấy danh sách devices của user
   */
  async getUserDevices(userId: number) {
    const userIdBi = BigInt(userId);

    const devices = await this.prisma.fcmToken.findMany({
      where: {
        user_id: userIdBi,
      },
      select: {
        id: true,
        device_name: true,
        platform: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    return devices.map((d) => ({
      ...d,
      id: d.id.toString(),
    }));
  }

  // ===================== PUSH NOTIFICATION =====================

  /**
   * Gửi push notification đến 1 user (tất cả devices)
   */
  async sendToUser(
    userId: number,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isFirebaseInitialized()) {
      this.logger.warn('Firebase not initialized. Skipping push notification.');
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = await this.getActiveTokens(userId);

    if (tokens.length === 0) {
      this.logger.debug(`No active FCM tokens for user ${userId}`);
      return { successCount: 0, failureCount: 0 };
    }

    return this.sendToTokens(tokens, title, body, data);
  }

  /**
   * Gửi push notification đến nhiều users
   */
  async sendToUsers(
    userIds: number[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isFirebaseInitialized()) {
      this.logger.warn('Firebase not initialized. Skipping push notification.');
      return { successCount: 0, failureCount: 0 };
    }

    const userIdsBi = userIds.map((id) => BigInt(id));

    const tokenRecords = await this.prisma.fcmToken.findMany({
      where: {
        user_id: { in: userIdsBi },
        is_active: true,
      },
      select: { token: true },
    });

    const tokens = tokenRecords.map((t) => t.token);

    if (tokens.length === 0) {
      this.logger.debug('No active FCM tokens for given users');
      return { successCount: 0, failureCount: 0 };
    }

    return this.sendToTokens(tokens, title, body, data);
  }

  /**
   * Gửi push notification đến danh sách tokens
   */
  private async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      this.logger.log(
        `FCM sent: ${response.successCount} success, ${response.failureCount} failures`,
      );

      // Xử lý token không hợp lệ → deactivate
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];

        response.responses.forEach((resp, idx) => {
          if (resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[idx]);
            }
            this.logger.warn(
              `FCM error for token ${tokens[idx].substring(0, 20)}...: ${resp.error.message}`,
            );
          }
        });

        // Vô hiệu hóa các token không hợp lệ
        if (invalidTokens.length > 0) {
          await this.prisma.fcmToken.updateMany({
            where: { token: { in: invalidTokens } },
            data: { is_active: false },
          });

          this.logger.log(
            `Deactivated ${invalidTokens.length} invalid FCM tokens`,
          );
        }
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error(`FCM send error: ${error.message}`, error.stack);
      return { successCount: 0, failureCount: tokens.length };
    }
  }
}
