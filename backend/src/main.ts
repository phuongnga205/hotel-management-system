import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

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

  app.enableCors();

  const API_DOCS_PATH = 'api/docs';
  const config = new DocumentBuilder()
    .setTitle('Hotel API (Neon DB Sync)')
    .setDescription('Tài liệu API quản lý khách sạn')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(API_DOCS_PATH, app, document);

  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('PORT') || 3000);
}
void bootstrap();
