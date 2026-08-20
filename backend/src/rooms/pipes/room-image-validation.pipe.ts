import {
  BadRequestException,
  Injectable,
  PipeTransform,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { open, unlink } from 'node:fs/promises';
import { I18nService } from 'nestjs-i18n';
import {
  ROOM_IMAGE,
  ROOM_IMAGE_MIME_TYPE,
  ROOM_IMAGE_SIGNATURE,
  RoomImageMimeType,
} from '../constants/room-image.constants';
import { RoomsLogger } from '../rooms.logger';

@Injectable()
export class RoomImageValidationPipe implements PipeTransform<
  Express.Multer.File | undefined,
  Promise<Express.Multer.File>
> {
  constructor(
    private readonly i18n: I18nService,
    private readonly logger: RoomsLogger,
  ) {}

  async transform(
    file: Express.Multer.File | undefined,
  ): Promise<Express.Multer.File> {
    if (!file) {
      throw new BadRequestException(
        this.i18n.t('messages.ROOM.IMAGE_FILE_REQUIRED'),
      );
    }

    if (file.size > ROOM_IMAGE.MAX_FILE_SIZE_BYTES) {
      await this.removeFile(file.path);
      throw new PayloadTooLargeException(
        this.i18n.t('messages.ROOM.IMAGE_TOO_LARGE'),
      );
    }

    if (!this.isSupportedMimeType(file.mimetype)) {
      await this.removeFile(file.path);
      throw new UnsupportedMediaTypeException(
        this.i18n.t('messages.ROOM.IMAGE_TYPE_UNSUPPORTED'),
      );
    }

    const hasValidSignature = await this.inspectSignature(
      file.path,
      file.mimetype,
    );
    if (hasValidSignature === null) {
      await this.removeFile(file.path);
      throw new BadRequestException(
        this.i18n.t('messages.ROOM.IMAGE_UPLOAD_FAILED'),
      );
    }

    if (!hasValidSignature) {
      await this.removeFile(file.path);
      throw new UnsupportedMediaTypeException(
        this.i18n.t('messages.ROOM.IMAGE_CONTENT_INVALID'),
      );
    }

    return file;
  }

  private isSupportedMimeType(mimeType: string): mimeType is RoomImageMimeType {
    return ROOM_IMAGE.SUPPORTED_MIME_TYPES.some((type) => type === mimeType);
  }

  private async hasValidSignature(
    path: string,
    mimeType: RoomImageMimeType,
  ): Promise<boolean> {
    const fileHandle = await open(path, 'r');
    try {
      const header = Buffer.alloc(ROOM_IMAGE_SIGNATURE.INSPECTION_BYTES);
      const { bytesRead } = await fileHandle.read(header, 0, header.length, 0);
      const content = header.subarray(0, bytesRead);

      switch (mimeType) {
        case ROOM_IMAGE_MIME_TYPE.JPEG:
          return content
            .subarray(0, ROOM_IMAGE_SIGNATURE.JPEG.length)
            .equals(ROOM_IMAGE_SIGNATURE.JPEG);
        case ROOM_IMAGE_MIME_TYPE.PNG:
          return content
            .subarray(0, ROOM_IMAGE_SIGNATURE.PNG.length)
            .equals(ROOM_IMAGE_SIGNATURE.PNG);
        case ROOM_IMAGE_MIME_TYPE.WEBP:
          return (
            content
              .subarray(0, ROOM_IMAGE_SIGNATURE.RIFF.length)
              .equals(ROOM_IMAGE_SIGNATURE.RIFF) &&
            content
              .subarray(ROOM_IMAGE_SIGNATURE.WEBP_FORMAT_OFFSET)
              .equals(ROOM_IMAGE_SIGNATURE.WEBP)
          );
      }
    } finally {
      await fileHandle.close();
    }
  }

  private async inspectSignature(
    path: string,
    mimeType: RoomImageMimeType,
  ): Promise<boolean | null> {
    try {
      return await this.hasValidSignature(path, mimeType);
    } catch (error: unknown) {
      this.logger.error({
        message:
          'Room image inspection failed; verify upload storage permissions and availability',
        filePath: path,
        error,
      });
      return null;
    }
  }

  private async removeFile(path: string): Promise<void> {
    await unlink(path).catch(() => undefined);
  }
}
