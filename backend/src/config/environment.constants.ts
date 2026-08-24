export const ENVIRONMENT_KEYS = {
  DATABASE_SSL_REJECT_UNAUTHORIZED: 'DATABASE_SSL_REJECT_UNAUTHORIZED',
  DATABASE_URL: 'DATABASE_URL',
  E2E_DATABASE_URL: 'E2E_DATABASE_URL',
  E2E_DATABASE_SSL_REJECT_UNAUTHORIZED: 'E2E_DATABASE_SSL_REJECT_UNAUTHORIZED',
  SIGNATURE: 'JWT_SECRET',
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  REDIS_HOST: 'REDIS_HOST',
  REDIS_PORT: 'REDIS_PORT',
  STATISTICS_CACHE_TTL_SECONDS: 'STATISTICS_CACHE_TTL_SECONDS',
  STATISTICS_TIME_ZONE: 'STATISTICS_TIME_ZONE',
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

export const MIN_NETWORK_PORT = 1;
export const MAX_NETWORK_PORT = 65_535;

export function parseNetworkPort(value: unknown, variableName: string): number {
  const port = typeof value === 'number' ? value : Number(value);
  if (
    !Number.isInteger(port) ||
    port < MIN_NETWORK_PORT ||
    port > MAX_NETWORK_PORT
  ) {
    throw new Error(
      `${variableName} must be an integer between ${MIN_NETWORK_PORT} and ${MAX_NETWORK_PORT}`,
    );
  }
  return port;
}

export const DEFAULT_AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// public_id cố định theo userId (thư mục "avatars" trên Cloudinary) — cho
// phép upload sau ghi đè (overwrite:true) và xoá mà không cần lưu riêng
// public_id vào DB, xem CloudinaryService.
export function buildAvatarPublicId(userId: string): string {
  return `avatars/user-${userId}`;
}
