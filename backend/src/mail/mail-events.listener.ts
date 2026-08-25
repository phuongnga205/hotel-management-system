import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { EmailType } from './entities/email-log.entity';
import {
  BookingStatusChangedEvent,
  MAIL_EVENT,
  PasswordResetRequestedEvent,
  ReviewDeletedEvent,
  UserRegisteredEvent,
} from './mail.events';
import { MailService } from './mail.service';

@Injectable()
export class MailEventsListener {
  constructor(
    private readonly mailService: MailService,
    private readonly i18n: I18nService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @OnEvent(MAIL_EVENT.USER_REGISTERED, {
    suppressErrors: false,
  })
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    const subject = this.i18n.t('messages.MAIL.ACTIVATION.SUBJECT');
    const text = this.i18n.t('messages.MAIL.ACTIVATION.BODY', {
      args: {
        recipientName: event.recipientName,
        otp: event.otp,
      },
    });
    await this.mailService.queueMail({
      type: EmailType.ACCOUNT_ACTIVATION,
      to: event.email,
      subject,
      text,
      html: this.toHtml(text),
    });
  }

  @OnEvent(MAIL_EVENT.PASSWORD_RESET_REQUESTED, {
    suppressErrors: false,
  })
  async handlePasswordResetRequested(
    event: PasswordResetRequestedEvent,
  ): Promise<void> {
    const subject = this.i18n.t('messages.MAIL.PASSWORD_RESET.SUBJECT');
    const text = this.i18n.t('messages.MAIL.PASSWORD_RESET.BODY', {
      args: {
        recipientName: event.recipientName,
        otp: event.otp,
      },
    });
    await this.mailService.queueMail({
      type: EmailType.PASSWORD_RESET,
      to: event.email,
      subject,
      text,
      html: this.toHtml(text),
    });
  }

  @OnEvent(MAIL_EVENT.BOOKING_STATUS_CHANGED, {
    suppressErrors: false,
  })
  async handleBookingStatusChanged(
    event: BookingStatusChangedEvent,
  ): Promise<void> {
    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.user', 'user')
      .innerJoinAndSelect('booking.room', 'room')
      .where('booking.id = :bookingId', { bookingId: event.bookingId })
      .getOne();
    if (!booking?.user || !booking.room) return;

    const subject = this.i18n.t('messages.MAIL.BOOKING_STATUS.SUBJECT', {
      args: { bookingId: booking.id },
    });
    const text = this.i18n.t('messages.MAIL.BOOKING_STATUS.BODY', {
      args: {
        recipientName: booking.user.fullName ?? booking.user.username,
        bookingId: booking.id,
        roomNumber: booking.room.roomNumber,
        status: event.status,
      },
    });
    await this.mailService.queueMail({
      type: EmailType.BOOKING_STATUS_CHANGED,
      to: booking.user.email,
      subject,
      text,
      html: this.toHtml(text),
    });
  }

  @OnEvent(MAIL_EVENT.REVIEW_DELETED, {
    suppressErrors: false,
  })
  async handleReviewDeleted(event: ReviewDeletedEvent): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: event.userId });
    if (!user) return;

    const subject = this.i18n.t('messages.MAIL.REVIEW_DELETED.SUBJECT');
    const text = this.i18n.t('messages.MAIL.REVIEW_DELETED.BODY');
    await this.mailService.queueMail({
      type: EmailType.REVIEW_DELETED,
      to: user.email,
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
