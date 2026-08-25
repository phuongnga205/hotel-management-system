import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { EntityManager } from 'typeorm';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { SendMailDto } from './dto/send-mail.dto';
import { EmailLog, EmailStatus, EmailType } from './entities/email-log.entity';
import { MailOutbox, OutboxStatus } from './entities/mail-outbox.entity';

@Injectable()
export class TransactionalMailService {
  constructor(private readonly i18n: I18nService) {}

  async createOutbox(
    manager: EntityManager,
    dto: SendMailDto,
    report?: { reportMonth: string; recipientUserId: string },
  ): Promise<EmailLog> {
    const emailLog = await manager.save(
      EmailLog,
      manager.create(EmailLog, {
        type: dto.type,
        recipient: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
        status: EmailStatus.PENDING,
        reportMonth: report?.reportMonth ?? null,
        recipientUserId: report?.recipientUserId ?? null,
      }),
    );
    await manager.save(
      MailOutbox,
      manager.create(MailOutbox, {
        emailLogId: emailLog.id,
        status: OutboxStatus.PENDING,
        payload: {
          to: dto.to,
          subject: dto.subject,
          text: dto.text,
          html: dto.html,
        },
      }),
    );
    return emailLog;
  }

  async createAccountActivationOutbox(
    manager: EntityManager,
    recipient: { email: string; name: string; otp: string },
  ): Promise<EmailLog> {
    const subject = this.i18n.t('messages.MAIL.ACTIVATION.SUBJECT');
    const text = this.i18n.t('messages.MAIL.ACTIVATION.BODY', {
      args: { recipientName: recipient.name, otp: recipient.otp },
    });
    return this.createOutbox(manager, {
      type: EmailType.ACCOUNT_ACTIVATION,
      to: recipient.email,
      subject,
      text,
      html: this.toHtml(text),
    });
  }

  async createPasswordResetOutbox(
    manager: EntityManager,
    recipient: { email: string; name: string; otp: string },
  ): Promise<EmailLog> {
    const subject = this.i18n.t('messages.MAIL.PASSWORD_RESET.SUBJECT');
    const text = this.i18n.t('messages.MAIL.PASSWORD_RESET.BODY', {
      args: { recipientName: recipient.name, otp: recipient.otp },
    });
    return this.createOutbox(manager, {
      type: EmailType.PASSWORD_RESET,
      to: recipient.email,
      subject,
      text,
      html: this.toHtml(text),
    });
  }

  async createBookingStatusOutbox(
    manager: EntityManager,
    booking: {
      id: string;
      status: BookingStatus;
      roomNumber: string;
      recipientEmail: string;
      recipientName: string;
    },
  ): Promise<EmailLog> {
    const subject = this.i18n.t('messages.MAIL.BOOKING_STATUS.SUBJECT', {
      args: { bookingId: booking.id },
    });
    const text = this.i18n.t('messages.MAIL.BOOKING_STATUS.BODY', {
      args: {
        recipientName: booking.recipientName,
        bookingId: booking.id,
        roomNumber: booking.roomNumber,
        status: booking.status,
      },
    });
    return this.createOutbox(manager, {
      type: EmailType.BOOKING_STATUS_CHANGED,
      to: booking.recipientEmail,
      subject,
      text,
      html: this.toHtml(text),
    });
  }

  async createReviewDeletedOutbox(
    manager: EntityManager,
    recipientEmail: string,
  ): Promise<EmailLog> {
    const subject = this.i18n.t('messages.MAIL.REVIEW_DELETED.SUBJECT');
    const text = this.i18n.t('messages.MAIL.REVIEW_DELETED.BODY');
    return this.createOutbox(manager, {
      type: EmailType.REVIEW_DELETED,
      to: recipientEmail,
      subject,
      text,
      html: this.toHtml(text),
    });
  }

  private toHtml(text: string): string {
    const escaped = text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
    return `<p>${escaped.replaceAll('\n', '<br>')}</p>`;
  }
}
