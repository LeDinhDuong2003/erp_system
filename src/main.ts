// src/main.ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { BigIntTransformInterceptor } from './common/interceptors/bigint-transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('ERP System API')
    .setDescription('API documentation for ERP System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('employees', 'Employee management')
    .addTag('roles', 'Role management')
    .addTag('permissions', 'Permission management')
    .addTag('projects', 'Project management')
    .addTag('positions', 'Position management')
    .addTag('departments', 'Department management')
    .addTag('employee-positions', 'Employee position management')
    .addTag('attendance', 'Attendance management')
    .addTag('employee-salary', 'Employee salary management')
    .addTag('leave-requests', 'Leave request management')
    .addTag('files', 'File management')
    .addTag('reports', 'Report management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Giữ authorization khi refresh page
    },
  });

  // Sử dụng ValidationPipe để tự động kiểm tra DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các trường không có trong DTO
    }),
  );
  // Transform BigInt thành string trong tất cả responses
  app.useGlobalInterceptors(new BigIntTransformInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();