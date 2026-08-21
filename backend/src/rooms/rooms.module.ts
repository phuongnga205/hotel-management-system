import { Module, UnsupportedMediaTypeException } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { I18nService } from 'nestjs-i18n';
import { RoomsService } from './rooms.service';
import { RoomsExportService } from './rooms-export.service';
import { Room } from './entities/room.entity';
import { AuthModule } from '../auth/auth.module';
import { RoomsLogger } from './rooms.logger';
import { RoomPersistenceExceptionFilter } from './filters/room-persistence-exception.filter';
import { AdminRoomsController } from './admin-rooms.controller';
import { PublicRoomsController } from './public-rooms.controller';
import { ROOM_IMAGE } from './constants/room-image.constants';
import { RoomImageValidationPipe } from './pipes/room-image-validation.pipe';
import { RoomImageUploadExceptionFilter } from './filters/room-image-upload-exception.filter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room]),
    AuthModule,
    // Ảnh phòng lưu Cloudinary (CloudinaryService là @Global, không cần
    // import CloudinaryModule ở đây) — team làm việc nhiều máy nên ảnh phải
    // ở chung 1 nơi, không lưu đĩa cục bộ nữa. Multer chỉ giữ file tạm
    // trong RAM (memoryStorage) để RoomsService đọc buffer rồi upload
    // thẳng lên Cloudinary.
    MulterModule.registerAsync({
      inject: [I18nService],
      useFactory: (i18n: I18nService) => ({
        storage: memoryStorage(),
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
  controllers: [AdminRoomsController, PublicRoomsController],
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
