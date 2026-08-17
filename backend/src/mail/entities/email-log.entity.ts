import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import {
  EMAIL_RECIPIENT_MAX_LENGTH,
  EMAIL_STATUS_MAX_LENGTH,
  EMAIL_TYPE_MAX_LENGTH,
} from '../mail.constants';

export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum EmailType {
  ACCOUNT_ACTIVATION = 'account-activation',
  PASSWORD_RESET = 'password-reset',
  BOOKING_STATUS_CHANGED = 'booking-status-changed',
  REVIEW_DELETED = 'review-deleted',
}

@Entity('email_logs')
@Check('chk_email_logs_retry_count', '"retry_count" >= 0')
export class EmailLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ length: EMAIL_TYPE_MAX_LENGTH })
  type!: string;

  @Column({ length: EMAIL_RECIPIENT_MAX_LENGTH })
  recipient!: string;

  @Index('idx_email_logs_status')
  @Column({ length: EMAIL_STATUS_MAX_LENGTH })
  status!: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  // Set the moment the SMTP send actually succeeds (distinct from queue time)
  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;
}
