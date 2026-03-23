import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? '*',
  });
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api');
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
}

const logger = new Logger('Bootstrap');
bootstrap().catch((err: unknown) => logger.error('Bootstrap failed', err));
