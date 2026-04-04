import { Transport, RmqOptions } from '@nestjs/microservices';

export const rmqConfig: RmqOptions = {
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
    queue: 'notifications_queue',
    queueOptions: {
      durable: true,
      arguments: {
        'x-message-ttl': 600000, // 10 minutes
        'x-max-length': 100000, // Max 100k messages in queue
      },
    },
    prefetchCount: 10, // Process 10 messages at a time per consumer
  },
};

export const NOTIFICATION_SEND_PATTERN = 'notification.send';
