import { ConfigService } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import {
  DEFAULT_AVATAR_MAX_FILE_SIZE_BYTES,
  ENVIRONMENT_KEYS,
} from './environment.constants';

export const ALLOWED_AVATAR_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function buildAvatarMulterOptions(
  configService: ConfigService,
): MulterOptions {
  const maxFileSize = configService.get<number>(
    ENVIRONMENT_KEYS.AVATAR_MAX_FILE_SIZE_BYTES,
    DEFAULT_AVATAR_MAX_FILE_SIZE_BYTES,
  );

  return {
    storage: memoryStorage(),
    limits: { fileSize: maxFileSize },
    fileFilter: (_req, file, callback) => {
      const ext = extname(file.originalname).toLowerCase();
      const isAllowed =
        ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype) &&
        ALLOWED_AVATAR_EXTENSIONS.includes(ext);
      callback(null, isAllowed);
    },
  };
}
