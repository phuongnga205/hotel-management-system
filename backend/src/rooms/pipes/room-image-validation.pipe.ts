import {
  BadRequestException,
  Injectable,
  PipeTransform,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import {
  ROOM_IMAGE,
  ROOM_IMAGE_MIME_TYPE,
  ROOM_IMAGE_SIGNATURE,
  RoomImageMimeType,
} from '../constants/room-image.constants';

// Multer dùng memoryStorage (ảnh phòng lưu Cloudinary, không ghi đĩa cục bộ
// nữa) nên file luôn có sẵn `buffer` trong RAM — validate trực tiếp trên
// buffer, không cần đọc/xoá file trên đĩa như trước (đơn giản hơn hẳn, và
// không còn lỗi filesystem nào có thể xảy ra ở bước này).
@Injectable()
export class RoomImageValidationPipe
  implements PipeTransform<Express.Multer.File | undefined, Express.Multer.File>
{
  constructor(private readonly i18n: I18nService) {}

  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw new BadRequestException(
        this.i18n.t('messages.ROOM.IMAGE_FILE_REQUIRED'),
      );
    }

    if (file.size > ROOM_IMAGE.MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        this.i18n.t('messages.ROOM.IMAGE_TOO_LARGE'),
      );
    }

    if (!this.isSupportedMimeType(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        this.i18n.t('messages.ROOM.IMAGE_TYPE_UNSUPPORTED'),
      );
    }

    if (!this.hasValidSignature(file.buffer, file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        this.i18n.t('messages.ROOM.IMAGE_CONTENT_INVALID'),
      );
    }

    return file;
  }

  private isSupportedMimeType(mimeType: string): mimeType is RoomImageMimeType {
    return ROOM_IMAGE.SUPPORTED_MIME_TYPES.some((type) => type === mimeType);
  }

  private hasValidSignature(
    buffer: Buffer,
    mimeType: RoomImageMimeType,
  ): boolean {
    const header = buffer.subarray(0, ROOM_IMAGE_SIGNATURE.INSPECTION_BYTES);

    switch (mimeType) {
      case ROOM_IMAGE_MIME_TYPE.JPEG:
        return header
          .subarray(0, ROOM_IMAGE_SIGNATURE.JPEG.length)
          .equals(ROOM_IMAGE_SIGNATURE.JPEG);
      case ROOM_IMAGE_MIME_TYPE.PNG:
        return header
          .subarray(0, ROOM_IMAGE_SIGNATURE.PNG.length)
          .equals(ROOM_IMAGE_SIGNATURE.PNG);
      case ROOM_IMAGE_MIME_TYPE.WEBP:
        return (
          header
            .subarray(0, ROOM_IMAGE_SIGNATURE.RIFF.length)
            .equals(ROOM_IMAGE_SIGNATURE.RIFF) &&
          header
            .subarray(ROOM_IMAGE_SIGNATURE.WEBP_FORMAT_OFFSET)
            .equals(ROOM_IMAGE_SIGNATURE.WEBP)
        );
    }
  }
}
