import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class RabbitmqService implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqService.name);

  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  // Kết nối tới RabbitMQ ngay khi module khởi tạo
  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('✅ Đã kết nối thành công tới RabbitMQ (CloudAMQP)');
    } catch (error) {
      this.logger.error('❌ Không thể kết nối tới RabbitMQ:', error);
    }
  }

  /**
   * Emit an event to RabbitMQ (Fire and forget)
   * @param pattern Event pattern (e.g., 'user_created')
   * @param data Payload data
   */
  async emit(pattern: string, data: any) {
    this.logger.log(`📤 Gửi message [${pattern}] tới RabbitMQ`);
    return lastValueFrom(this.client.emit(pattern, data));
  }

  /**
   * Send a message and wait for response (Request-Response)
   * @param pattern Message pattern (e.g., 'get_user_info')
   * @param data Payload data
   */
  async send(pattern: string, data: any) {
    const response$ = this.client.send(pattern, data);
    return lastValueFrom(response$);
  }
}
