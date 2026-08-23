export const MAIL_QUEUE = 'mail';

export const MAIL_JOB = {
  SEND_EMAIL: 'send-email',
  MAX_ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
} as const;

export enum MailJob {
  SEND = 'send',
}

export const EMAIL_RECIPIENT_MAX_LENGTH = 255;
export const EMAIL_TYPE_MAX_LENGTH = 50;
export const EMAIL_STATUS_MAX_LENGTH = 20;

export const EMAIL_SUBJECT_MAX_LENGTH = 200;
export const EMAIL_TEXT_MAX_LENGTH = 20_000;
export const EMAIL_HTML_MAX_LENGTH = 50_000;

export const MAIL_QUEUE_BATCH_SIZE = 50;
export const MAIL_QUEUE_LOCK_TIMEOUT_MINUTES = 5;

// Cổng SMTP mặc định khi biến môi trường MAIL_PORT không được cấu hình.
export const DEFAULT_MAIL_PORT = 587;
