import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { ReportDispatchStatus } from '../reports/entities/monthly-report-dispatch.entity';
import { MonthlyReportDispatch } from '../reports/entities/monthly-report-dispatch.entity';
import { MAIL_JOB, MAIL_QUEUE, MAIL_RECONCILIATION } from './mail.constants';
import { ENVIRONMENT_KEYS } from '../config/environment.constants';
import {
  MailDeliveryError,
  MAIL_ERROR_CODE,
} from './errors/mail-delivery.error';
import { MailErrorSanitizer } from './mail-error.sanitizer';
import { RedisUtil } from '../token/redis.util';

export interface SendMailJobData {
  emailLogId: string;
  retryGeneration: number;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** URL chính thức của Brevo Transactional Email API v3 */
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly brevoApiKey: string;
  private readonly mailFrom: string;
  private readonly senderName: string;
  private readonly senderEmail: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    private readonly dataSource: DataSource,
    private readonly mailErrorSanitizer: MailErrorSanitizer,
    private readonly redisUtil: RedisUtil,
  ) {
    super();

    this.brevoApiKey = this.configService.getOrThrow<string>(
      ENVIRONMENT_KEYS.BREVO_API_KEY,
    );
    this.mailFrom = this.configService.getOrThrow<string>(
      ENVIRONMENT_KEYS.MAIL_FROM,
    );

    // Tách "Hotel Management System <hotel.management.2vnq@gmail.com>"
    // thành senderName và senderEmail cho đúng format Brevo API.
    const match = this.mailFrom.match(/^(.+)\s*<(.+)>$/);
    if (match) {
      this.senderName = match[1].trim().replace(/^"|"$/g, '');
      this.senderEmail = match[2].trim();
    } else {
      this.senderName = 'Hotel Management System';
      this.senderEmail = this.mailFrom;
    }
  }

  async process(job: Job<SendMailJobData>): Promise<string> {
    const { emailLogId, retryGeneration, to, subject, text, html } = job.data;

    // attemptsMade counts *previous* attempts, so this attempt is +1.
    await this.emailLogRepository.update(emailLogId, {
      retryCount: job.attemptsMade,
    });

    let messageId: string;

    try {
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html || `<pre>${text}</pre>`,
          textContent: text,
          headers: {
            'X-Idempotency-Key': `email/${emailLogId}/${retryGeneration}`,
          },
        }),
      });

      const body = (await response.json()) as Record<string, unknown>;

      if (!response.ok || typeof body.messageId !== 'string') {
        const msg =
          typeof body.message === 'string'
            ? body.message
            : `Brevo API error: HTTP ${response.status}`;
        const error = new Error(msg) as Error & {
          statusCode?: number;
          code?: string;
        };
        error.statusCode = response.status;
        if (typeof body.code === 'string') {
          error.code = body.code;
        }
        throw error;
      }

      messageId = body.messageId;
    } catch (error) {
      const sanitizedMessage = this.mailErrorSanitizer.toPublicCode(error);
      const maxAttempts = job.opts.attempts ?? MAIL_JOB.MAX_ATTEMPTS;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          EmailLog,
          { id: emailLogId },
          {
            status: isFinalAttempt ? EmailStatus.FAILED : EmailStatus.PENDING,
            lastError: sanitizedMessage,
          },
        );

        if (isFinalAttempt) {
          await manager.update(
            MonthlyReportDispatch,
            { emailLogId },
            { status: ReportDispatchStatus.FAILED },
          );
        }
      });

      this.logger.error('Email delivery failed', {
        emailLogId,
        error: sanitizedMessage,
        rawError: error instanceof Error ? error.message : String(error),
      });
      throw new MailDeliveryError(MAIL_ERROR_CODE.DELIVERY_FAILED, {
        cause: error,
      });
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          EmailLog,
          { id: emailLogId },
          {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            lastError: null,
          },
        );

        await manager.update(
          MonthlyReportDispatch,
          { emailLogId },
          { status: ReportDispatchStatus.SUCCESS },
        );
      });

      this.logger.log('Email sent successfully', {
        emailLogId,
        messageId,
      });
    } catch (error) {
      this.logger.error(
        'Email delivered but status persistence failed. Pushing to unconfirmed queue.',
        error instanceof Error ? error.stack : String(error),
      );
      try {
        await this.redisUtil.lpush(MAIL_RECONCILIATION.QUEUE_KEY, emailLogId);
      } catch (redisError) {
        this.logger.error('Failed to push to unconfirmed queue', redisError);
      }
    }

    return messageId;
  }
}
