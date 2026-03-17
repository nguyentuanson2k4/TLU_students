import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  let basePort = parseInt(process.env.PORT || '3000', 10);

  while (true) {
    try {
      await app.listen(basePort);
      console.log(`Application is running on port: ${basePort}`);
      break;
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        console.warn(`Port ${basePort} is in use, trying port ${basePort + 1}...`);
        basePort++;
      } else {
        throw error;
      }
    }
  }
}
bootstrap();
