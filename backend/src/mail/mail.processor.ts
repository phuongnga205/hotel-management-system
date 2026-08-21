import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Repository } from 'typeorm';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { DEFAULT_MAIL_PORT, MAIL_QUEUE } from './mail.constants';
import { ENVIRONMENT_KEYS } from '../config/environment.constants';

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

    try {
      const info = await this.transporter.sendMail({
        from: this.mailFrom,
        to,
        subject,
        text,
        html,
      });

      await this.emailLogRepository.update(emailLogId, {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        lastError: null,
      });

      this.logger.log('Email sent successfully', {
        emailLogId,
        messageId: info.messageId,
      });
      return info.messageId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const maxAttempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      await this.emailLogRepository.update(emailLogId, {
        status: isFinalAttempt ? EmailStatus.FAILED : EmailStatus.PENDING,
        lastError: message,
      });

      this.logger.error('Email delivery failed', {
        emailLogId,
        error: message,
      });
      throw new Error(`Email delivery failed: ${message}`);
    }
  }
}
