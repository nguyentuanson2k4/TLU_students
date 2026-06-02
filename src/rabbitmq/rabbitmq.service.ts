import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class RabbitmqService {
  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  /**
   * Emit an event to RabbitMQ (Fire and forget)
   * @param pattern Event pattern (e.g., 'user_created')
   * @param data Payload data
   */
  emit(pattern: string, data: any) {
    return this.client.emit(pattern, data);
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
