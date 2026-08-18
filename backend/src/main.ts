import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_SERVER_PORT,
  ENVIRONMENT_KEYS,
} from './config/environment.constants';
// AppDataSource is intentionally not imported here; migrations are run via scripts

const API_DOCS_PATH = 'api/docs';

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
  SwaggerModule.setup(API_DOCS_PATH, app, document);

  // Migrations are not run automatically on startup. Use `npm run migration:run` to apply migrations.

  const configService = app.get(ConfigService);
  const port = configService.get<number>(
    ENVIRONMENT_KEYS.PORT,
    DEFAULT_SERVER_PORT,
  );
  await app.listen(port);
}
void bootstrap();
