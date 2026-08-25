export const ENVIRONMENT_KEYS = {
  DATABASE_SSL_REJECT_UNAUTHORIZED: 'DATABASE_SSL_REJECT_UNAUTHORIZED',
  DATABASE_URL: 'DATABASE_URL',
  DATABASE_SEEDING_ENABLED: 'DATABASE_SEEDING_ENABLED',
  E2E_DATABASE_URL: 'E2E_DATABASE_URL',
  E2E_DATABASE_SSL_ENABLED: 'E2E_DATABASE_SSL_ENABLED',
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
  MAIL_HOST: 'MAIL_HOST',
  MAIL_PORT: 'MAIL_PORT',
  MAIL_USER: 'MAIL_USER',
  MAIL_PASS: 'MAIL_PASS',
  MAIL_FROM: 'MAIL_FROM',
  REPORT_CRON: 'REPORT_CRON',
  REPORT_RUN_ON_ANY_DAY: 'REPORT_RUN_ON_ANY_DAY',
  REPORT_TIME_ZONE: 'REPORT_TIME_ZONE',
  HOTEL_TIMEZONE: 'HOTEL_TIMEZONE',
} as const;

export enum NodeEnvironment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export const DEFAULT_SERVER_PORT = 3000;
export const DEFAULT_REDIS_HOST = 'localhost';
export const DEFAULT_REDIS_PORT = 6379;
export const DEFAULT_REPORT_CRON = '5 0 1 * *';
export const DEFAULT_REPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

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

// Múi giờ dùng để tính "hôm nay" khi validate ngày check-in booking (VD:
// chặn đặt phòng cho ngày quá khứ)
export const DEFAULT_HOTEL_TIMEZONE = 'Asia/Ho_Chi_Minh';

// public_id cố định theo userId (thư mục "avatars" trên Cloudinary) — cho
// phép upload sau ghi đè (overwrite:true) và xoá mà không cần lưu riêng
// public_id vào DB, xem CloudinaryService.
export function buildAvatarPublicId(userId: string): string {
  return `avatars/user-${userId}`;
}

// Khác avatar: 1 phòng có N ảnh (không phải 1 slot cố định) nên public_id
// phải duy nhất theo từng ảnh, không chỉ theo roomId — gộp roomId (thư mục
// theo phòng, tiện dọn rác khi xoá phòng) + uuid ảnh. public_id được lưu
// lại ở `images.image_public_id` (không suy ra lại được như avatar) để biết
// đúng asset nào cần xoá khi remove 1 ảnh cụ thể.
export function buildRoomImagePublicId(
  roomId: string,
  imageUuid: string,
): string {
  return `rooms/room-${roomId}/${imageUuid}`;
}
