import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { EmailLogResponseDto } from './dto/email-log-response.dto';
import { SendMailDto } from './dto/send-mail.dto';
import { ListEmailLogsDto } from './dto/list-email-logs.dto';
import { EntityManager } from 'typeorm';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { MailOutbox, OutboxStatus } from './entities/mail-outbox.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    @InjectRepository(MailOutbox)
    private readonly mailOutboxRepository: Repository<MailOutbox>,
    private readonly i18n: I18nService,
    private readonly dataSource: DataSource,
  ) {}

  async createOutbox(
    manager: EntityManager,
    dto: SendMailDto,
  ): Promise<EmailLog> {
    const newEmailLog = manager.create(EmailLog, {
      type: dto.type,
      recipient: dto.to,
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
      status: EmailStatus.PENDING,
    });
    const savedEmailLog = await manager.save(EmailLog, newEmailLog);

    const outbox = manager.create(MailOutbox, {
      emailLogId: savedEmailLog.id,
      status: OutboxStatus.PENDING,
      payload: {
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      },
    });
    await manager.save(MailOutbox, outbox);

    return savedEmailLog;
  }

  async queueMail(dto: SendMailDto): Promise<EmailLogResponseDto> {
    const emailLog = await this.dataSource.transaction(async (manager) => {
      return this.createOutbox(manager, dto);
    });

    this.logger.log('Queued email via outbox', {
      emailLogId: emailLog.id,
      type: dto.type,
    });

    return EmailLogResponseDto.fromEntity(emailLog);
  }

  async getEmailLog(id: string) {
    const emailLog = await this.emailLogRepository.findOneBy({ id });
    if (!emailLog) {
      throw new NotFoundException(
        this.i18n.t('messages.MAIL.LOG_NOT_FOUND', { args: { id } }),
      );
    }
    return {
      statusCode: 200,
      message: 'Lấy chi tiết email log thành công',
      data: EmailLogResponseDto.fromEntity(emailLog),
    };
  }

  async getEmailLogs(query: ListEmailLogsDto) {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<EmailLog> = {};
    if (status) {
      where.status = status;
    }

    const [logs, total] = await this.emailLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      statusCode: 200,
      message: 'Lấy danh sách email log thành công',
      data: {
        items: logs.map((log) => EmailLogResponseDto.fromEntity(log)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async retryEmailLog(id: string): Promise<void> {
    const emailLog = await this.emailLogRepository.findOneBy({ id });
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

    // Insert a new outbox record and update email log status within transaction
    await this.dataSource.transaction(async (manager) => {
      emailLog.status = EmailStatus.PENDING;
      emailLog.lastError = null;
      await manager.save(EmailLog, emailLog);

      const outbox = manager.create(MailOutbox, {
        emailLogId: emailLog.id,
        status: OutboxStatus.PENDING,
        payload: {
          to: emailLog.recipient,
          subject: emailLog.subject || '',
          text: emailLog.text || '',
          html: emailLog.html,
        },
      });
      await manager.save(MailOutbox, outbox);
    });

    this.logger.log(`Retrying email log ${id} via outbox`);
  }
}
