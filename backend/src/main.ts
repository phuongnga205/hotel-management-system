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
import AppDataSource from './data-source';

async function bootstrap() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();

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

  // Ảnh phòng và avatar đều lưu Cloudinary (xem
  // cloudinary/cloudinary.service.ts) — không còn phục vụ file tĩnh cục bộ
  // nào (team làm việc nhiều máy, ảnh phải ở chung 1 nơi trên CDN).

  const port = configService.get<number>(
    ENVIRONMENT_KEYS.PORT,
    DEFAULT_SERVER_PORT,
  );
  await app.listen(port);
}
void bootstrap();
