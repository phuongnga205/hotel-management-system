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
@Check('chk_monthly_report_dispatches_status', `"status" IN ('PENDING','QUEUED','SUCCESS','FAILED')`)
export class MonthlyReportDispatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 7 })
  reportMonth!: string; // Format: YYYY-MM

  @Column({ type: 'bigint' }) // User.id is bigint
  recipientId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ReportDispatchStatus.PENDING,
  })
  status!: ReportDispatchStatus;
}
