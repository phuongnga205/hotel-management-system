import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { EmailType } from '../mail/entities/email-log.entity';
import { MailService } from '../mail/mail.service';
import { AppEvent } from '../common/events/event-names.constants';
import { UserRegisteredEvent } from '../common/events/user-registered.event';
import { PasswordResetRequestedEvent } from '../common/events/password-reset-requested.event';
import { PasswordChangedEvent } from '../common/events/password-changed.event';
import { BookingStatusChangedEvent } from '../common/events/booking-status-changed.event';
import { ReviewDeletedEvent } from '../common/events/review-deleted.event';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly i18n: I18nService,
  ) {}

  @OnEvent(AppEvent.USER_REGISTERED, { async: true })
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    await this.queue(
      event.email,
      EmailType.ACCOUNT_ACTIVATION,
      'messages.MAIL.TEMPLATES.ACCOUNT_ACTIVATION.SUBJECT',
      'messages.MAIL.TEMPLATES.ACCOUNT_ACTIVATION.BODY',
      { username: event.username, otp: event.activationOtp },
    );
  }

  @OnEvent(AppEvent.PASSWORD_RESET_REQUESTED, { async: true })
  async handlePasswordResetRequested(
    event: PasswordResetRequestedEvent,
  ): Promise<void> {
    await this.queue(
      event.email,
      EmailType.PASSWORD_RESET,
      'messages.MAIL.TEMPLATES.PASSWORD_RESET.SUBJECT',
      'messages.MAIL.TEMPLATES.PASSWORD_RESET.BODY',
      { username: event.username, otp: event.resetOtp },
    );
  }

  @OnEvent(AppEvent.PASSWORD_CHANGED, { async: true })
  async handlePasswordChanged(event: PasswordChangedEvent): Promise<void> {
    await this.queue(
      event.email,
      EmailType.PASSWORD_CHANGED,
      'messages.MAIL.TEMPLATES.PASSWORD_CHANGED.SUBJECT',
      'messages.MAIL.TEMPLATES.PASSWORD_CHANGED.BODY',
      { username: event.username },
    );
  }

  @OnEvent(AppEvent.BOOKING_STATUS_CHANGED, { async: true })
  async handleBookingStatusChanged(
    event: BookingStatusChangedEvent,
  ): Promise<void> {
    const status = this.i18n.t(
      `messages.BOOKING.STATUS_LABEL.${event.newStatus}`,
    );

    await this.queue(
      event.userEmail,
      EmailType.BOOKING_STATUS_CHANGED,
      'messages.MAIL.TEMPLATES.BOOKING_STATUS_CHANGED.SUBJECT',
      'messages.MAIL.TEMPLATES.BOOKING_STATUS_CHANGED.BODY',
      {
        username: event.username,
        bookingId: event.bookingId,
        status,
      },
    );
  }

  @OnEvent(AppEvent.REVIEW_DELETED, { async: true })
  async handleReviewDeleted(event: ReviewDeletedEvent): Promise<void> {
    await this.queue(
      event.userEmail,
      EmailType.REVIEW_DELETED,
      'messages.MAIL.TEMPLATES.REVIEW_DELETED.SUBJECT',
      'messages.MAIL.TEMPLATES.REVIEW_DELETED.BODY',
      { username: event.username },
    );
  }

  private async queue(
    to: string,
    type: EmailType,
    subjectKey: string,
    bodyKey: string,
    args: Record<string, string>,
  ): Promise<void> {
    const subject = this.i18n.t<string, string>(subjectKey, { args });
    const html = this.i18n.t<string, string>(bodyKey, { args });

    try {
      await this.mailService.queueMail({
        to,
        type,
        subject,
        text: html,
        html,
      });
    } catch (error) {
      // Gửi mail thất bại không được làm sập luồng nghiệp vụ chính (đăng ký,
      // huỷ booking...) — chỉ log lại, MailProcessor đã tự retry qua BullMQ.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to queue ${type} email to ${to}: ${message}`);
    }
  }
}
