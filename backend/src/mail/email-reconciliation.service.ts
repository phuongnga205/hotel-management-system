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
import { MAIL_RECONCILIATION } from './mail.constants';

@Injectable()
export class EmailReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(EmailReconciliationService.name);

  constructor(
    private readonly redisUtil: RedisUtil,
    private readonly dataSource: DataSource,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const job = new CronJob(MAIL_RECONCILIATION.CRON, () => {
      this.reconcileEmails().catch((err: unknown) => {
        this.logger.error(
          'Error in email reconciliation',
          err instanceof Error ? err.stack : String(err),
        );
      });
    });

    this.schedulerRegistry.addCronJob(MAIL_RECONCILIATION.JOB_NAME, job);
    job.start();
    this.logger.log('Started email reconciliation cron job');
  }

  async reconcileEmails(): Promise<void> {
    for (
      let processed = 0;
      processed < MAIL_RECONCILIATION.BATCH_SIZE;
      processed += 1
    ) {
      const emailLogId = await this.redisUtil.rpop(
        MAIL_RECONCILIATION.QUEUE_KEY,
      );
      if (!emailLogId) return;

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
      } catch (error: unknown) {
        await this.redisUtil.lpush(MAIL_RECONCILIATION.QUEUE_KEY, emailLogId);
        this.logger.error({
          message: 'Email reconciliation failed',
          emailLogId,
          error: error instanceof Error ? error.message : String(error),
          nextAction: 'Retry on the next scheduled reconciliation run',
        });
        // Stop so the requeued item cannot be popped again in the same run.
        return;
      }
    }
  }
}
