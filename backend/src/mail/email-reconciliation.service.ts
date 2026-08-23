import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DataSource } from 'typeorm';
import { RedisUtil } from '../token/redis.util';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import {
  MonthlyReportDispatch,
  ReportDispatchStatus,
} from '../reports/entities/monthly-report-dispatch.entity';

const EMAIL_RECONCILIATION_JOB_NAME = 'email-reconciliation-job';

@Injectable()
export class EmailReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(EmailReconciliationService.name);

  constructor(
    private readonly redisUtil: RedisUtil,
    private readonly dataSource: DataSource,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const job = new CronJob(
      '*/5 * * * *', // Run every 5 minutes
      () => {
        this.reconcileEmails().catch((err: unknown) => {
          this.logger.error(
            'Error in email reconciliation',
            err instanceof Error ? err.stack : String(err),
          );
        });
      },
    );

    this.schedulerRegistry.addCronJob(EMAIL_RECONCILIATION_JOB_NAME, job);
    job.start();
    this.logger.log('Started email reconciliation cron job');
  }

  async reconcileEmails() {
    while (true) {
      const emailLogId = await this.redisUtil.rpop(
        'email:delivery:unconfirmed',
      );
      if (!emailLogId) break;

      try {
        await this.dataSource.transaction(async (manager) => {
          const emailLog = await manager.findOne(EmailLog, {
            where: { id: emailLogId },
          });
          if (
            emailLog &&
            (emailLog.status === EmailStatus.PENDING ||
              emailLog.status === EmailStatus.FAILED)
          ) {
            await manager.update(
              EmailLog,
              { id: emailLogId },
              {
                status: EmailStatus.DELIVERED_UNCONFIRMED,
                lastError: null,
              },
            );
            await manager.update(
              MonthlyReportDispatch,
              { emailLogId },
              { status: ReportDispatchStatus.SUCCESS },
            );
            this.logger.log(`Reconciled email delivery for log ${emailLogId}`);
          }
        });
      } catch (error) {
        this.logger.error(`Failed to reconcile email log ${emailLogId}`, error);
        // Put it back to retry later
        await this.redisUtil.lpush('email:delivery:unconfirmed', emailLogId);
      }
    }
  }
}
