import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsExportService } from './rooms-export.service';
import { Room } from './entities/room.entity';
import { AuthModule } from '../auth/auth.module';
import { RoomsLogger } from './rooms.logger';
import { RoomPersistenceExceptionFilter } from './filters/room-persistence-exception.filter';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ENVIRONMENT_KEYS } from '../config/environment.constants';
import {
  ROOM_IMAGE,
  ROOM_IMAGE_EXTENSION_BY_MIME_TYPE,
} from './constants/room-image.constants';
import { I18nService } from 'nestjs-i18n';
import { UnsupportedMediaTypeException } from '@nestjs/common';
import { RoomImageValidationPipe } from './pipes/room-image-validation.pipe';
import { RoomImageUploadExceptionFilter } from './filters/room-image-upload-exception.filter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room]),
    AuthModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService, I18nService],
      useFactory: (configService: ConfigService, i18n: I18nService) => ({
        storage: diskStorage({
          destination: (_request, _file, callback) => {
            const directory = resolve(
              configService.get<string>(
                ENVIRONMENT_KEYS.ROOM_UPLOAD_DIRECTORY,
                ROOM_IMAGE.DEFAULT_UPLOAD_DIRECTORY,
              ),
            );
            mkdirSync(directory, { recursive: true });
            callback(null, directory);
          },
          filename: (_request, file, callback) => {
            const extension =
              ROOM_IMAGE_EXTENSION_BY_MIME_TYPE[file.mimetype] || '.bin';
            callback(null, `${randomUUID()}${extension}`);
          },
        }),
        fileFilter: (_request, file, callback) => {
          const isSupported = ROOM_IMAGE.SUPPORTED_MIME_TYPES.some(
            (mimeType) => mimeType === file.mimetype,
          );
          if (!isSupported) {
            callback(
              new UnsupportedMediaTypeException(
                i18n.t('messages.ROOM.IMAGE_TYPE_UNSUPPORTED'),
              ),
              false,
            );
            return;
          }
          callback(null, true);
        },
        limits: { fileSize: ROOM_IMAGE.MAX_FILE_SIZE_BYTES },
      }),
    }),
  ],
  controllers: [RoomsController],
  providers: [
    RoomsService,
    RoomsExportService,
    RoomsLogger,
    RoomPersistenceExceptionFilter,
    RoomImageUploadExceptionFilter,
    RoomImageValidationPipe,
  ],
})
export class RoomsModule {}
