import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Ctx, RmqContext, Payload } from '@nestjs/microservices';
import { NotificationsFanoutService } from './notifications.fanout.service';
import { NOTIFICATION_SEND_PATTERN } from '../config/rmq.config';

@Controller()
export class NotificationsConsumerController {
  private readonly logger = new Logger(NotificationsConsumerController.name);

  constructor(private readonly fanoutService: NotificationsFanoutService) {}

  @EventPattern(NOTIFICATION_SEND_PATTERN)
  async handleNotificationSendEvent(
    @Payload() payload: any,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      let messageData = payload;

      if (Buffer.isBuffer(payload)) {
        messageData = JSON.parse(payload.toString());
      } else if (typeof payload === 'string') {
        messageData = JSON.parse(payload);
      }

      if (!messageData || typeof messageData !== 'object') {
        throw new Error(
          `Invalid payload format: expected object, got ${typeof messageData}`,
        );
      }

      this.logger.log(
        `[Consumer] Received event: ${messageData.notification_type} - "${messageData.title}"`,
      );

      await this.fanoutService.process(messageData);

      channel.ack(originalMsg);

      this.logger.debug('[Consumer] Message acknowledged (ack)');
    } catch (error) {
      this.logger.error(
        `[Consumer] Error processing event: ${error.message}`,
        error.stack,
      );

      channel.nack(originalMsg, false, true); // nack(msg, allUpTo, requeue=true)

      this.logger.warn('[Consumer] Message nacked and requeued for retry');
    }
  }
}
