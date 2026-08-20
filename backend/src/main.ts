import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_SERVER_PORT,
  ENVIRONMENT_KEYS,
} from './config/environment.constants';
import { resolve } from 'node:path';
import { ROOM_IMAGE } from './rooms/constants/room-image.constants';
// AppDataSource is intentionally not imported here; migrations are run via scripts

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new I18nValidationExceptionFilter());
  // Chỉ dùng I18nValidationPipe (đã kế thừa ValidationPipe) — dùng cả 2 pipe
  // sẽ khiến class-validator chạy 2 lần trên mỗi request, lãng phí và có
  // thể sinh lỗi validate trùng lặp.
  app.useGlobalPipes(
    new I18nValidationPipe({ whitelist: true, transform: true }),
  );

  // Cấu hình CORS để Frontend (ReactJS) có thể gọi API mà không bị chặn
  app.enableCors();

  const API_DOCS_PATH = 'api/docs';
  const config = new DocumentBuilder()
    .setTitle('Hotel API (Neon DB Sync)')
    .setDescription('Tài liệu API quản lý khách sạn')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(API_DOCS_PATH, app, document);

  // Migrations are not run automatically on startup. Use `npm run migration:run` to apply migrations.

  // Serve ảnh phòng upload local disk (feature/be-admin-room-management) —
  // KHÔNG liên quan avatar user (đã chuyển sang Cloudinary, xem
  // cloudinary/cloudinary.service.ts). 2 cơ chế lưu ảnh khác nhau đang tồn
  // tại song song, cần thống nhất lại sau merge — xem ghi chú trao đổi với
  // team.
  const roomUploadDirectory = resolve(
    configService.get<string>(
      ENVIRONMENT_KEYS.ROOM_UPLOAD_DIRECTORY,
      ROOM_IMAGE.DEFAULT_UPLOAD_DIRECTORY,
    ),
  );
  app.useStaticAssets(roomUploadDirectory, {
    prefix: ROOM_IMAGE.PUBLIC_PREFIX,
  });

  const port = configService.get<number>(
    ENVIRONMENT_KEYS.PORT,
    DEFAULT_SERVER_PORT,
  );
  await app.listen(port);
}
void bootstrap();
