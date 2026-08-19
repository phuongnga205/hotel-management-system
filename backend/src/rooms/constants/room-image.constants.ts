export const ROOM_IMAGE_MIME_TYPE = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
} as const;

export const ROOM_IMAGE = {
  DEFAULT_UPLOAD_DIRECTORY: 'uploads/rooms',
  FIELD_NAME: 'file',
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  PUBLIC_PREFIX: '/uploads/rooms',
  SUPPORTED_MIME_TYPES: Object.values(ROOM_IMAGE_MIME_TYPE),
} as const;

export type RoomImageMimeType =
  (typeof ROOM_IMAGE.SUPPORTED_MIME_TYPES)[number];

export const ROOM_IMAGE_SIGNATURE = {
  JPEG: Buffer.from([0xff, 0xd8, 0xff]),
  PNG: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  RIFF: Buffer.from('RIFF'),
  WEBP: Buffer.from('WEBP'),
  WEBP_FORMAT_OFFSET: 8,
  INSPECTION_BYTES: 12,
} as const;

export const ROOM_IMAGE_EXTENSION_BY_MIME_TYPE: Readonly<
  Record<string, string>
> = {
  [ROOM_IMAGE_MIME_TYPE.JPEG]: '.jpg',
  [ROOM_IMAGE_MIME_TYPE.PNG]: '.png',
  [ROOM_IMAGE_MIME_TYPE.WEBP]: '.webp',
};
