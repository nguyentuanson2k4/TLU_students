import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitmqService } from './rabbitmq.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'main_queue', // You can change this queue name based on your needs
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  providers: [RabbitmqService],
  exports: [RabbitmqService, ClientsModule],
})
export class RabbitmqModule {}
