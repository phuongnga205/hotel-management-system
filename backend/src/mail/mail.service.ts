import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { EmailLogResponseDto } from './dto/email-log-response.dto';
import { SendMailDto } from './dto/send-mail.dto';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { MAIL_QUEUE, MailJob } from './mail.constants';

const MAIL_JOB_ATTEMPTS = 3;
const MAIL_JOB_BACKOFF_MS = 5000;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    @InjectQueue(MAIL_QUEUE)
    private readonly mailQueue: Queue,
  ) {}

  async queueMail(dto: SendMailDto): Promise<EmailLogResponseDto> {
    const emailLog = await this.emailLogRepository.save(
      this.emailLogRepository.create({
        type: dto.type,
        recipient: dto.to,
        status: EmailStatus.PENDING,
      }),
    );

    await this.mailQueue.add(
      MailJob.SEND,
      {
        emailLogId: emailLog.id,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      },
      {
        attempts: MAIL_JOB_ATTEMPTS,
        backoff: { type: 'exponential', delay: MAIL_JOB_BACKOFF_MS },
      },
    );

    this.logger.log(
      `Queued email ${emailLog.id} (type: ${dto.type}) to ${dto.to}`,
    );

    return EmailLogResponseDto.fromEntity(emailLog);
  }

  async getEmailLog(id: string): Promise<EmailLogResponseDto> {
    const emailLog = await this.emailLogRepository.findOneBy({ id });
    if (!emailLog) {
      // TODO(i18n): nestjs-i18n is installed but not bootstrapped anywhere
      // in the app yet — swap for an i18n key once I18nModule is set up.
      throw new NotFoundException(`Email log ${id} not found`);
    }
    return EmailLogResponseDto.fromEntity(emailLog);
  }
}
