import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { rmqConfig } from './config/rmq.config';

// Polyfill BigInt serialization to avoid JSON.stringify errors
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  // Connect RabbitMQ microservice for async notification processing
  app.connectMicroservice(rmqConfig);
  console.log('[RabbitMQ] Microservice configured');

  // Start all microservices (RabbitMQ consumer)
  try {
    await app.startAllMicroservices();
    console.log(
      '[RabbitMQ] Consumer started - listening for notification.send events',
    );
  } catch (error) {
    console.error('[RabbitMQ] Failed to start microservice:', error);
    throw error;
  }

  // Start HTTP server
  let basePort = parseInt(process.env.PORT || '3000', 10);

  while (true) {
    try {
      await app.listen(basePort, '0.0.0.0');
      console.log(
        `\n[HTTP] Application is running on: http://localhost:${basePort}`,
      );
      console.log(
        `[HTTP] Swagger docs available at: http://localhost:${basePort}/api/docs`,
      );
      console.log(
        '[System] Both HTTP server and RabbitMQ consumer are running\n',
      );
      break;
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        console.warn(
          `[HTTP] Port ${basePort} is in use, trying port ${basePort + 1}...`,
        );
        basePort++;
      } else {
        throw error;
      }
    }
  }
}
bootstrap();
