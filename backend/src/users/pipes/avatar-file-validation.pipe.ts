import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import {
  DEFAULT_AVATAR_MAX_FILE_SIZE_BYTES,
  ENVIRONMENT_KEYS,
} from '../../config/environment.constants';
import {
  ALLOWED_AVATAR_EXTENSIONS,
  ALLOWED_AVATAR_MIME_TYPES,
} from '../../config/avatar-upload.config';
import { extname } from 'path';

@Injectable()
export class AvatarFileValidationPipe implements PipeTransform {
  constructor(
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
  ) {}

  transform(file?: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException(
        this.i18n.t('messages.USERS.AVATAR_INVALID_FILE'),
      );
    }

    const ext = extname(file.originalname).toLowerCase();
    const isAllowedType =
      ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype) &&
      ALLOWED_AVATAR_EXTENSIONS.includes(ext);

    if (!isAllowedType) {
      throw new BadRequestException(
        this.i18n.t('messages.USERS.AVATAR_INVALID_FILE'),
      );
    }

    const maxFileSize = this.configService.get<number>(
      ENVIRONMENT_KEYS.AVATAR_MAX_FILE_SIZE_BYTES,
      DEFAULT_AVATAR_MAX_FILE_SIZE_BYTES,
    );

    if (file.size > maxFileSize) {
      throw new BadRequestException(
        this.i18n.t('messages.USERS.AVATAR_FILE_TOO_LARGE'),
      );
    }

    return file;
  }
}
