import { Decimal } from 'decimal.js';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { EmailType } from './entities/email-log.entity';
import { MailEventsListener } from './mail-events.listener';
import {
  BookingStatusChangedEvent,
  PasswordResetRequestedEvent,
  ReviewDeletedEvent,
  UserRegisteredEvent,
} from './mail.events';
import { MailService } from './mail.service';

describe('MailEventsListener', () => {
  const mailService = { queueMail: jest.fn().mockResolvedValue({}) };
  const i18n = {
    t: jest.fn((key: string, options?: { args?: Record<string, unknown> }) =>
      options?.args ? `${key}:${JSON.stringify(options.args)}` : key,
    ),
  };
  const bookingRepository = { createQueryBuilder: jest.fn() };
  const userRepository = { findOneBy: jest.fn() };
  const listener = new MailEventsListener(
    mailService as unknown as MailService,
    i18n as unknown as I18nService,
    bookingRepository as unknown as Repository<Booking>,
    userRepository as unknown as Repository<User>,
  );

  beforeEach(() => jest.clearAllMocks());

  it('queues an account activation email without exposing OTP outside its body', async () => {
    await listener.handleUserRegistered(
      new UserRegisteredEvent('1', 'guest@example.com', 'Guest', '123456'),
    );

    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EmailType.ACCOUNT_ACTIVATION,
        to: 'guest@example.com',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        text: expect.stringContaining('123456'),
      }),
    );
  });

  it('queues a password reset email', async () => {
    await listener.handlePasswordResetRequested(
      new PasswordResetRequestedEvent(
        '1',
        'guest@example.com',
        'Guest',
        '654321',
      ),
    );

    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({ type: EmailType.PASSWORD_RESET }),
    );
  });

  it('loads booking relations with QueryBuilder and queues a status email', async () => {
    const booking = {
      id: '10',
      user: {
        email: 'guest@example.com',
        username: 'guest',
        fullName: 'Guest',
      },
      room: { roomNumber: '101' } as Room,
      totalPrice: new Decimal(100),
    } as Booking;
    const queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(booking),
    };
    bookingRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await listener.handleBookingStatusChanged(
      new BookingStatusChangedEvent('10', BookingStatus.ACCEPTED),
    );

    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({ type: EmailType.BOOKING_STATUS_CHANGED }),
    );
  });

  it('queues the fixed review-deleted notification', async () => {
    userRepository.findOneBy.mockResolvedValue({
      id: '1',
      email: 'guest@example.com',
      username: 'guest',
    });

    await listener.handleReviewDeleted(new ReviewDeletedEvent('20', '1'));

    expect(mailService.queueMail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EmailType.REVIEW_DELETED,
        text: 'messages.MAIL.REVIEW_DELETED.BODY',
      }),
    );
    expect(i18n.t).toHaveBeenCalledWith('messages.MAIL.REVIEW_DELETED.BODY');
  });
});
