import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_SERVER_PORT,
  ENVIRONMENT_KEYS,
} from './config/environment.constants';
// AppDataSource is intentionally not imported here; migrations are run via scripts

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new I18nValidationExceptionFilter());
  app.useGlobalPipes(
    new I18nValidationPipe({ whitelist: true, transform: true }),
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
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

  const configService = app.get(ConfigService);
  const port = configService.get<number>(
    ENVIRONMENT_KEYS.PORT,
    DEFAULT_SERVER_PORT,
  );
  await app.listen(port);
}
void bootstrap();
