import { NestFactory, Reflector } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as path from 'path';
import { Prisma } from '@prisma/client';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

(Prisma.Decimal.prototype as any).toJSON = function () {
  return this.toNumber();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình RabbitMQ Microservice Consumer với Manual ACK
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'main_queue',
      noAck: false, // BẮT BUỘC: Xác nhận thủ công (chống mất tin nhắn khi lỗi)
      queueOptions: {
        durable: true,
      },
    },
  });

  app.enableCors();

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Serve static files from uploads directory
  const uploadPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadPath));

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  // Bắt đầu lắng nghe các Microservice (bao gồm RabbitMQ) trước khi mở cổng HTTP
  await app.startAllMicroservices();

  let basePort = parseInt(process.env.PORT || '3000', 10);

  while (true) {
    try {
      await app.listen(basePort, '0.0.0.0');
      console.log(`Application is running on port: ${basePort}`);
      break;
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        console.warn(
          `Port ${basePort} is in use, trying port ${basePort + 1}...`,
        );
        basePort++;
      } else {
        throw error;
      }
    }
  }
}
bootstrap();
