import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
export const OutboxStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const satisfies Record<string, OutboxStatus>;

@Entity('mail_outbox')
@Check('chk_mail_outbox_status', `"status" IN ('PENDING','PROCESSING','PROCESSED','FAILED')`)
@Index('idx_mail_outbox_status_created_at', ['status', 'createdAt'])
export class MailOutbox {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint' }) // EmailLog id is bigint (PrimaryGeneratedColumn('increment'))
  emailLogId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: OutboxStatus.PENDING,
  })
  status!: OutboxStatus;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
