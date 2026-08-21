import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { EmailLog } from './entities/email-log.entity';
import { MailOutbox, OutboxStatus } from './entities/mail-outbox.entity';
import { MAIL_QUEUE } from './mail.constants';

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
  async processOutbox() {
    let pendingOutbox: MailOutbox[] = [];

    // 1. Transactionally lock and claim pending outbox records
    await this.dataSource.transaction(async (manager) => {
      pendingOutbox = await manager
        .createQueryBuilder(MailOutbox, 'outbox')
        .where('outbox.status = :status', { status: OutboxStatus.PENDING })
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .orderBy('outbox.createdAt', 'ASC')
        .take(50)
        .getMany();

      if (pendingOutbox.length > 0) {
        const outboxIds = pendingOutbox.map((o) => o.id);
        await manager
          .createQueryBuilder()
          .update(MailOutbox)
          .set({ status: OutboxStatus.PROCESSING })
          .whereInIds(outboxIds)
          .execute();
      }
    });

    if (pendingOutbox.length === 0) return;

    // 2. Process each claimed record individually
    for (const outbox of pendingOutbox) {
      try {
        const emailLog = await this.emailLogRepository.findOne({
          where: { id: outbox.emailLogId },
        });

        if (!emailLog) {
          await this.outboxRepository.update(outbox.id, {
            status: OutboxStatus.FAILED,
          });
          continue;
        }

        const jobId = `email-${emailLog.id}`;
        const payload = outbox.payload as {
          to: string;
          subject: string;
          text: string;
          html?: string;
        };

        await this.mailQueue.add(
          'send-email', // job name
          {
            emailLogId: emailLog.id,
            to: payload.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
          },
          {
            jobId, // deterministic job id
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        );

        await this.outboxRepository.update(outbox.id, {
          status: OutboxStatus.PROCESSED,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to process outbox id ${outbox.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        await this.outboxRepository.update(outbox.id, {
          status: OutboxStatus.FAILED,
        });
      }
    }
  }
}
