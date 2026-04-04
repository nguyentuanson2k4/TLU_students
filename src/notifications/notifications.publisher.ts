import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { NOTIFICATION_SEND_PATTERN } from '../config/rmq.config';

@Injectable()
export class NotificationsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsPublisher.name);
  private client: ClientProxy;
  private isConnected = false;

  async onModuleInit() {
    try {
      this.client = ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: 'notifications_queue',
          queueOptions: {
            durable: true,
            arguments: {
              'x-message-ttl': 600000,
              'x-max-length': 100000,
            },
          },
          prefetchCount: 10,
        },
      });

      await this.client.connect();
      this.isConnected = true;
      this.logger.log('[Publisher] Connected to RabbitMQ successfully');
    } catch (error) {
      this.logger.error('[Publisher] Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.logger.log('[Publisher] Disconnected from RabbitMQ');
    }
  }

  /**
   * Publish notification event to RabbitMQ queue
   * Returns immediately without waiting for processing
   */
  async publishNotificationEvent(payload: any): Promise<void> {
    if (!this.isConnected) {
      this.logger.error(
        '[Publisher] Not connected to RabbitMQ, cannot publish event',
      );
      throw new Error('RabbitMQ Publisher not initialized');
    }

    try {
      this.logger.debug(
        `[Publisher] Publishing event: ${payload.notification_type}`,
      );

      // Fire-and-forget pattern - doesn't wait for response
      this.client.emit(NOTIFICATION_SEND_PATTERN, payload);

      this.logger.debug(
        `[Publisher] Event published successfully for: ${payload.title}`,
      );
    } catch (error) {
      this.logger.error('[Publisher] Failed to publish event:', error);
      throw error;
    }
  }
}
