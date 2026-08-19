import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { NotificationsListener } from './notifications.listener';
import { MailService } from '../mail/mail.service';
import { EmailType } from '../mail/entities/email-log.entity';
import { UserRegisteredEvent } from '../common/events/user-registered.event';
import { PasswordResetRequestedEvent } from '../common/events/password-reset-requested.event';
import { PasswordChangedEvent } from '../common/events/password-changed.event';
import { BookingStatusChangedEvent } from '../common/events/booking-status-changed.event';
import { ReviewDeletedEvent } from '../common/events/review-deleted.event';
import { BookingStatus } from '../bookings/enums/booking-status.enum';

describe('NotificationsListener', () => {
  let listener: NotificationsListener;
  let mailService: { queueMail: jest.Mock };
  let i18nService: { t: jest.Mock };

  beforeEach(async () => {
    mailService = { queueMail: jest.fn().mockResolvedValue({ id: '1' }) };
    // Trả về chính key được truyền vào, đủ để assert đúng key đã dùng mà
    // không cần load thật file JSON i18n.
    i18nService = { t: jest.fn((key: string) => key) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsListener,
        { provide: MailService, useValue: mailService },
        { provide: I18nService, useValue: i18nService },
      ],
    }).compile();

    listener = module.get<NotificationsListener>(NotificationsListener);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('handleUserRegistered() queues an ACCOUNT_ACTIVATION email with the OTP as an arg', async () => {
    const event = new UserRegisteredEvent(
      '1',
      'test@mail.com',
      'test',
      '123456',
    );

    await listener.handleUserRegistered(event);

    expect(i18nService.t).toHaveBeenCalledWith(
      'messages.MAIL.TEMPLATES.ACCOUNT_ACTIVATION.SUBJECT',
      { args: { username: 'test', otp: '123456' } },
    );
    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@mail.com',
        type: EmailType.ACCOUNT_ACTIVATION,
      }),
    );
  });

  it('handlePasswordResetRequested() queues a PASSWORD_RESET email with the OTP as an arg', async () => {
    const event = new PasswordResetRequestedEvent(
      '1',
      'test@mail.com',
      'test',
      '654321',
    );

    await listener.handlePasswordResetRequested(event);

    expect(i18nService.t).toHaveBeenCalledWith(
      'messages.MAIL.TEMPLATES.PASSWORD_RESET.SUBJECT',
      { args: { username: 'test', otp: '654321' } },
    );
    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@mail.com',
        type: EmailType.PASSWORD_RESET,
      }),
    );
  });

  it('handlePasswordChanged() queues a PASSWORD_CHANGED email', async () => {
    const event = new PasswordChangedEvent('1', 'test@mail.com', 'test');

    await listener.handlePasswordChanged(event);

    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@mail.com',
        type: EmailType.PASSWORD_CHANGED,
      }),
    );
  });

  it('handleBookingStatusChanged() resolves the status label via i18n before queuing', async () => {
    const event = new BookingStatusChangedEvent(
      '10',
      '1',
      'test@mail.com',
      'test',
      BookingStatus.PENDING,
      BookingStatus.CANCELLED,
    );

    await listener.handleBookingStatusChanged(event);

    expect(i18nService.t).toHaveBeenCalledWith(
      `messages.BOOKING.STATUS_LABEL.${BookingStatus.CANCELLED}`,
    );
    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@mail.com',
        type: EmailType.BOOKING_STATUS_CHANGED,
      }),
    );
  });

  it('handleReviewDeleted() queues a REVIEW_DELETED email', async () => {
    const event = new ReviewDeletedEvent('5', '1', 'test@mail.com', 'test');

    await listener.handleReviewDeleted(event);

    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@mail.com',
        type: EmailType.REVIEW_DELETED,
      }),
    );
  });

  it('should log and swallow the error instead of throwing when MailService fails', async () => {
    mailService.queueMail.mockRejectedValue(new Error('SMTP down'));
    const event = new PasswordChangedEvent('1', 'test@mail.com', 'test');

    await expect(
      listener.handlePasswordChanged(event),
    ).resolves.toBeUndefined();
  });
});
