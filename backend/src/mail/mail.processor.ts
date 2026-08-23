import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { DataSource, Repository } from 'typeorm';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { ReportDispatchStatus } from '../reports/entities/monthly-report-dispatch.entity';
import { MonthlyReportDispatch } from '../reports/entities/monthly-report-dispatch.entity';
import { DEFAULT_MAIL_PORT, MAIL_JOB, MAIL_QUEUE } from './mail.constants';
import { ENVIRONMENT_KEYS } from '../config/environment.constants';
import {
  MailDeliveryError,
  MAIL_ERROR_CODE,
} from './errors/mail-delivery.error';
import { MailErrorSanitizer } from './mail-error.sanitizer';

interface SendMailJobData {
  emailLogId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private readonly mailFrom: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    private readonly dataSource: DataSource,
    private readonly mailErrorSanitizer: MailErrorSanitizer,
  ) {
    super();

    const host = this.configService.getOrThrow<string>(
      ENVIRONMENT_KEYS.MAIL_HOST,
    );
    const user = this.configService.getOrThrow<string>(
      ENVIRONMENT_KEYS.MAIL_USER,
    );
    const pass = this.configService.getOrThrow<string>(
      ENVIRONMENT_KEYS.MAIL_PASS,
    );
    const from = this.configService.getOrThrow<string>(
      ENVIRONMENT_KEYS.MAIL_FROM,
    );

    this.mailFrom = from;
    this.transporter = nodemailer.createTransport({
      host,
      port: this.configService.get<number>(
        ENVIRONMENT_KEYS.MAIL_PORT,
        DEFAULT_MAIL_PORT,
      ),
      secure: false,
      auth: { user, pass },
    });
  }

  async process(job: Job<SendMailJobData>): Promise<string> {
    const { emailLogId, to, subject, text, html } = job.data;

    // attemptsMade counts *previous* attempts, so this attempt is +1.
    await this.emailLogRepository.update(emailLogId, {
      retryCount: job.attemptsMade,
    });

    let messageId: string;

    try {
      const info = await this.transporter.sendMail({
        from: this.mailFrom,
        to,
        subject,
        text,
        html,
      });
      messageId = info.messageId;
    } catch (error) {
      const sanitizedMessage = this.mailErrorSanitizer.toPublicCode(error);
      const maxAttempts = job.opts.attempts ?? MAIL_JOB.MAX_ATTEMPTS;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      await this.emailLogRepository.update(emailLogId, {
        status: isFinalAttempt ? EmailStatus.FAILED : EmailStatus.PENDING,
        lastError: sanitizedMessage,
      });

      if (isFinalAttempt) {
        await this.dataSource.query(
          'UPDATE monthly_report_dispatches SET status = $1 WHERE "email_log_id" = $2',
          [ReportDispatchStatus.FAILED, emailLogId],
        );
      }

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
        'Email delivered but status persistence failed',
        error instanceof Error ? error.stack : String(error),
      );
    }

    return messageId;
  }
}
