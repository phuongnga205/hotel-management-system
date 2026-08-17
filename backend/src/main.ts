import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Gắn tiền tố api/v1 cho toàn bộ hệ thống
  app.setGlobalPrefix('api/v1');

  // 2. Bật Whitelist (Loại bỏ dữ liệu rác từ Frontend gửi lên)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // 3. Cấu hình CORS để Frontend (ReactJS) có thể gọi API mà không bị chặn
  app.enableCors();

  // 4. Khởi tạo giao diện Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Hotel API (Neon DB Sync)')
    .setDescription('Tài liệu API quản lý khách sạn')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
