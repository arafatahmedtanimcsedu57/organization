import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.ts';
import type { AppConfig } from './config/configuration.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const configService = app.get(ConfigService<AppConfig, true>);
  const port = configService.get('port', { infer: true });
  await app.listen(port);
}

void bootstrap();
