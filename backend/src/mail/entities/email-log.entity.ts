import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  EMAIL_RECIPIENT_MAX_LENGTH,
  EMAIL_STATUS_MAX_LENGTH,
  EMAIL_TYPE_MAX_LENGTH,
} from '../mail.constants';

// Cột `email_logs.status`/`.type` đều là varchar + CHECK (status) hoặc
// varchar tự do quy ước theo EmailType (type) — không phải Postgres enum,
// nên dùng type + const object thay vì TS `enum`, khớp đúng bản chất cột DB.
export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';
export const EmailStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const satisfies Record<string, EmailStatus>;

export type EmailType =
  | 'account-activation'
  | 'password-reset'
  | 'booking-status-changed'
  | 'review-deleted'
  | 'monthly-report';
export const EmailType = {
  ACCOUNT_ACTIVATION: 'account-activation',
  PASSWORD_RESET: 'password-reset',
  BOOKING_STATUS_CHANGED: 'booking-status-changed',
  REVIEW_DELETED: 'review-deleted',
  MONTHLY_REPORT: 'monthly-report',
} as const satisfies Record<string, EmailType>;

@Entity('email_logs')
@Check('chk_email_logs_retry_count', '"retry_count" >= 0')
@Check('chk_email_logs_status', `"status" IN ('PENDING','SENT','FAILED')`)
export class EmailLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ length: EMAIL_TYPE_MAX_LENGTH })
  type!: EmailType;

  @Column({ length: EMAIL_RECIPIENT_MAX_LENGTH })
  recipient!: string;

  @Index('idx_email_logs_status')
  @Column({ length: EMAIL_STATUS_MAX_LENGTH, default: EmailStatus.PENDING })
  status!: EmailStatus;

  @Column({ name: 'retry_count', type: 'smallint', default: 0 })
  retryCount!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'text', nullable: true })
  html!: string | null;

  // Set the moment the SMTP send actually succeeds (distinct from queue time)
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
