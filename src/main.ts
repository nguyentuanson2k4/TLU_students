import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { rmqConfig } from './config/rmq.config';

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
