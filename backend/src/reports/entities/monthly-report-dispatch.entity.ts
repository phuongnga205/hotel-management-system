import { Check, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type ReportDispatchStatus = 'PENDING' | 'QUEUED' | 'SUCCESS' | 'FAILED';
export const ReportDispatchStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const satisfies Record<string, ReportDispatchStatus>;

@Entity('monthly_report_dispatches')
@Unique(['reportMonth', 'recipientId'])
@Check(
  'chk_monthly_report_dispatch_status',
  `"status" IN ('PENDING','QUEUED','SUCCESS','FAILED')`,
)
export class MonthlyReportDispatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_month', type: 'varchar', length: 7 })
  reportMonth!: string;

  @Column({ name: 'recipient_id', type: 'bigint' })
  recipientId!: string;

  @Column({ name: 'email_log_id', type: 'bigint', nullable: true })
  emailLogId!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ReportDispatchStatus.PENDING,
  })
  status!: ReportDispatchStatus;
}
