import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailLogResponseDto } from './dto/email-log-response.dto';
import { SendMailDto } from './dto/send-mail.dto';
import { ListEmailLogsDto } from './dto/list-email-logs.dto';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { MailOutbox, OutboxStatus } from './entities/mail-outbox.entity';
import { MAIL_JOB, MAIL_QUEUE } from './mail.constants';
import { EmailLogListResponseDto } from './dto/email-log-list-response.dto';
import {
  EmailLogDetailResponseDto,
  RetryEmailLogResponseDto,
} from './dto/email-log-detail-response.dto';
import { TransactionalMailService } from './transactional-mail.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    @InjectQueue(MAIL_QUEUE)
    private readonly mailQueue: Queue,
    private readonly i18n: I18nService,
    private readonly dataSource: DataSource,
    private readonly transactionalMailService: TransactionalMailService,
  ) {}

  async createOutbox(
    manager: EntityManager,
    dto: SendMailDto,
    report?: { reportMonth: string; recipientUserId: string },
  ): Promise<EmailLog> {
    return this.transactionalMailService.createOutbox(manager, dto, report);
  }

  async createOutboxForExisting(
    manager: EntityManager,
    emailLog: EmailLog,
  ): Promise<void> {
    await manager.save(
      MailOutbox,
      manager.create(MailOutbox, {
        emailLogId: emailLog.id,
        status: OutboxStatus.PENDING,
        payload: {
          to: emailLog.recipient,
          subject: emailLog.subject,
          text: emailLog.text,
          html: emailLog.html,
        },
      }),
    );
  }

  async enqueueEmail(emailLog: EmailLog): Promise<void> {
    await this.mailQueue.add(
      MAIL_JOB.SEND_EMAIL,
      {
        emailLogId: emailLog.id,
        retryGeneration: emailLog.retryGeneration,
        to: emailLog.recipient,
        subject: emailLog.subject,
        text: emailLog.text,
        html: emailLog.html,
      },
      {
        jobId: `email-${emailLog.id}-generation-${emailLog.retryGeneration}`,
        attempts: MAIL_JOB.MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: MAIL_JOB.BACKOFF_DELAY_MS },
      },
    );
  }

  async queueMail(dto: SendMailDto): Promise<EmailLogDetailResponseDto> {
    const emailLog = await this.dataSource.transaction(async (manager) => {
      return this.createOutbox(manager, dto);
    });

    this.logger.log('Queued email', {
      emailLogId: emailLog.id,
      type: dto.type,
    });

    return {
      statusCode: 201,
      message: this.i18n.t('messages.MAIL.QUEUE_ACCEPTED'),
      data: EmailLogResponseDto.fromEntity(emailLog),
    };
  }

  async getEmailLog(id: string): Promise<EmailLogDetailResponseDto> {
    const emailLog = await this.emailLogRepository.findOneBy({ id });
    if (!emailLog) {
      throw new NotFoundException(
        this.i18n.t('messages.MAIL.LOG_NOT_FOUND', { args: { id } }),
      );
    }
    return {
      statusCode: 200,
      message: this.i18n.t('messages.MAIL.GET_LOG_SUCCESS'),
      data: EmailLogResponseDto.fromEntity(emailLog),
    };
  }

  async getEmailLogs(
    query: ListEmailLogsDto,
  ): Promise<EmailLogListResponseDto> {
    const { status, page, limit } = query;
    const queryBuilder = this.emailLogRepository
      .createQueryBuilder('emailLog')
      .orderBy('emailLog.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    if (status) {
      queryBuilder.andWhere('emailLog.status = :status', { status });
    }
    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.MAIL.GET_LOGS_SUCCESS'),
      data: {
        items: logs.map((log) => EmailLogResponseDto.fromEntity(log)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async retryEmailLog(id: string): Promise<RetryEmailLogResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const emailLog = await manager
        .getRepository(EmailLog)
        .createQueryBuilder('emailLog')
        .setLock('pessimistic_write')
        .where('emailLog.id = :id', { id })
        .getOne();

      if (!emailLog) {
        throw new NotFoundException(
          this.i18n.t('messages.MAIL.LOG_NOT_FOUND', { args: { id } }),
        );
      }

      if (emailLog.status !== EmailStatus.FAILED) {
        throw new ConflictException(
          this.i18n.t('messages.MAIL.RETRY_INVALID_STATUS'),
        );
      }

      emailLog.status = EmailStatus.PENDING;
      emailLog.lastError = null;
      emailLog.retryGeneration += 1;
      const savedEmailLog = await manager.save(EmailLog, emailLog);
      await this.createOutboxForExisting(manager, savedEmailLog);
    });

    this.logger.log(`Retrying email log ${id}`);
    return {
      statusCode: 202,
      message: this.i18n.t('messages.MAIL.RETRY_ACCEPTED'),
      data: null,
    };
  }
}
