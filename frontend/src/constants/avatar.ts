/**
 * PHẢI khớp `DEFAULT_AVATAR_MAX_FILE_SIZE_BYTES`/`ALLOWED_AVATAR_MIME_TYPES`
 * ở `backend/src/config/avatar-upload.config.ts` — validate trước ở client
 * chỉ để phản hồi nhanh hơn (đỡ tốn 1 lượt upload), BE vẫn tự validate lại
 * lần cuối (`AvatarFileValidationPipe`), không được bỏ qua validate phía BE.
 */
export const AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
