export const ENVIRONMENT_KEYS = {
  DATABASE_SSL_REJECT_UNAUTHORIZED: 'DATABASE_SSL_REJECT_UNAUTHORIZED',
  DATABASE_URL: 'DATABASE_URL',
  SIGNATURE: 'JWT_SECRET',
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  ROOM_UPLOAD_DIRECTORY: 'ROOM_UPLOAD_DIRECTORY',
  TYPEORM_SYNCHRONIZE: 'TYPEORM_SYNCHRONIZE',
  AVATAR_MAX_FILE_SIZE_BYTES: 'AVATAR_MAX_FILE_SIZE_BYTES',
  CLOUDINARY_CLOUD_NAME: 'CLOUDINARY_CLOUD_NAME',
  CLOUDINARY_API_KEY: 'CLOUDINARY_API_KEY',
  CLOUDINARY_API_SECRET: 'CLOUDINARY_API_SECRET',
} as const;

export enum NodeEnvironment {
  DEVELOPMENT = 'development',
  TEST = 'test',
}

export const DEFAULT_SERVER_PORT = 3000;

export const DEFAULT_AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// public_id cố định theo userId (thư mục "avatars" trên Cloudinary) — cho
// phép upload sau ghi đè (overwrite:true) và xoá mà không cần lưu riêng
// public_id vào DB, xem CloudinaryService.
export function buildAvatarPublicId(userId: string): string {
  return `avatars/user-${userId}`;
}
