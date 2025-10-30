// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Sử dụng ValidationPipe để tự động kiểm tra DTO
  app.useGlobalPipes(new ValidationPipe({
      whitelist: true, // Loại bỏ các trường không có trong DTO
  })); 
  await app.listen(3000);
}
bootstrap();