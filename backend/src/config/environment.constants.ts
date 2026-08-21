export const ENVIRONMENT_KEYS = {
  DATABASE_SSL_REJECT_UNAUTHORIZED: 'DATABASE_SSL_REJECT_UNAUTHORIZED',
  DATABASE_URL: 'DATABASE_URL',
  SIGNATURE: 'JWT_SECRET',
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
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
