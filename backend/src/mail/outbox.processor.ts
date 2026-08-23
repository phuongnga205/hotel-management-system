import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Brackets, DataSource, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { MailOutbox, OutboxStatus } from './entities/mail-outbox.entity';
import {
  MonthlyReportDispatch,
  ReportDispatchStatus,
} from '../reports/entities/monthly-report-dispatch.entity';
import { MailOutboxPayloadDto } from './dto/mail-outbox-payload.dto';
import { InvalidOutboxPayloadError } from './errors/invalid-outbox-payload.error';
import { MAIL_ERROR_CODE } from './errors/mail-delivery.error';
import {
  MAIL_JOB,
  MAIL_QUEUE,
  MAIL_QUEUE_BATCH_SIZE,
  MAIL_QUEUE_LOCK_TIMEOUT_MINUTES,
} from './mail.constants';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    @InjectRepository(MailOutbox)
    private readonly outboxRepository: Repository<MailOutbox>,
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    @InjectQueue(MAIL_QUEUE)
    private readonly mailQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox(): Promise<void> {
    let pendingOutbox: MailOutbox[] = [];

    await this.dataSource.transaction(async (manager) => {
      const expiredAt = DateTime.now()
        .minus({ minutes: MAIL_QUEUE_LOCK_TIMEOUT_MINUTES })
        .toJSDate();

      await manager
        .createQueryBuilder()
        .update(MailOutbox)
        .set({ status: OutboxStatus.PENDING, lockedAt: null })
        .where('status = :processing', { processing: OutboxStatus.PROCESSING })
        .andWhere('locked_at < :expiredAt', { expiredAt })
        .execute();

      pendingOutbox = await manager
        .createQueryBuilder(MailOutbox, 'outbox')
        .where('outbox.status = :status', { status: OutboxStatus.PENDING })
        .andWhere(
          new Brackets((qb) => {
            qb.where('outbox.nextAttemptAt IS NULL').orWhere(
              'outbox.nextAttemptAt <= :now',
              { now: new Date() },
            );
          }),
        )
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .orderBy('outbox.createdAt', 'ASC')
        .take(MAIL_QUEUE_BATCH_SIZE)
        .getMany();

      if (pendingOutbox.length === 0) return;

      await manager
        .createQueryBuilder()
        .update(MailOutbox)
        .set({ status: OutboxStatus.PROCESSING, lockedAt: new Date() })
        .whereInIds(pendingOutbox.map((outbox) => outbox.id))
        .execute();
    });

    for (const outbox of pendingOutbox) {
      try {
        const emailLog = await this.emailLogRepository.findOneBy({
          id: outbox.emailLogId,
        });

        if (!emailLog) {
          await this.outboxRepository.update(outbox.id, {
            status: OutboxStatus.FAILED,
          });
          continue;
        }

        const payload = plainToInstance(MailOutboxPayloadDto, outbox.payload);
        const errors = await validate(payload);

        if (errors.length > 0) {
          throw new InvalidOutboxPayloadError(outbox.id);
        }

        await this.mailQueue.add(
          MAIL_JOB.SEND_EMAIL,
          {
            emailLogId: emailLog.id,
            to: payload.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
          },
          {
            jobId: `email-${emailLog.id}-generation-${emailLog.retryGeneration}`,
            attempts: MAIL_JOB.MAX_ATTEMPTS,
            backoff: { type: 'exponential', delay: MAIL_JOB.BACKOFF_DELAY_MS },
          },
        );

        await this.dataSource.transaction(async (manager) => {
          await manager.update(
            MailOutbox,
            { id: outbox.id },
            {
              status: OutboxStatus.PROCESSED,
              lockedAt: null,
            },
          );

          await manager.update(
            MonthlyReportDispatch,
            { emailLogId: outbox.emailLogId },
            { status: ReportDispatchStatus.QUEUED },
          );
        });
      } catch (error: unknown) {
        const nextAttemptCount = outbox.attemptCount + 1;
        const exhausted = nextAttemptCount >= MAIL_JOB.MAX_ATTEMPTS;

        this.logger.error(
          `Failed to enqueue outbox id ${outbox.id}`,
          error instanceof Error ? error.stack : String(error),
        );

        if (exhausted) {
          await this.dataSource.transaction(async (manager) => {
            await manager.update(
              MailOutbox,
              { id: outbox.id },
              {
                status: OutboxStatus.FAILED,
                lockedAt: null,
                attemptCount: nextAttemptCount,
              },
            );

            await manager.update(
              EmailLog,
              { id: outbox.emailLogId },
              {
                status: EmailStatus.FAILED,
                lastError: MAIL_ERROR_CODE.OUTBOX_EXHAUSTED,
              },
            );

            await manager.update(
              MonthlyReportDispatch,
              { emailLogId: outbox.emailLogId },
              { status: ReportDispatchStatus.FAILED },
            );
          });
        } else {
          await this.outboxRepository.update(outbox.id, {
            status: OutboxStatus.PENDING,
            attemptCount: nextAttemptCount,
            nextAttemptAt: DateTime.now()
              .plus({ minutes: Math.pow(2, nextAttemptCount) })
              .toJSDate(),
            lockedAt: null,
          });
        }
      }
    }
  }
}
