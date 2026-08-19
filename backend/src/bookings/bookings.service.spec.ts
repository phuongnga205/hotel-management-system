import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { Room } from '../rooms/entities/room.entity';
import { AppEvent } from '../common/events/event-names.constants';

describe('BookingsService', () => {
  let service: BookingsService;
  let i18nService: { t: jest.Mock };
  let bookingsRepository: { findOne: jest.Mock; save: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    i18nService = { t: jest.fn((key: string) => key) };
    bookingsRepository = { findOne: jest.fn(), save: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: bookingsRepository,
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {},
        },
        {
          provide: I18nService,
          useValue: i18nService,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('remove() returns an i18n-resolved message, not a hard-coded string', () => {
    const result = service.remove('1');

    expect(i18nService.t).toHaveBeenCalledWith(
      'messages.BOOKING.DELETED_SUCCESS',
    );
    expect(result).toEqual({ message: 'messages.BOOKING.DELETED_SUCCESS' });
  });

  describe('cancel', () => {
    const bookingId = '10';
    const userId = '1';
    const dto = { reason: 'Đổi lịch trình cá nhân' };
    const buildBooking = (overrides: Partial<Booking> = {}) =>
      ({
        id: bookingId,
        userId,
        status: BookingStatus.PENDING,
        user: {
          id: userId,
          email: 'test@mail.com',
          username: 'test',
        },
        ...overrides,
      }) as Booking;

    it('should cancel the booking and emit BookingStatusChanged', async () => {
      const booking = buildBooking();
      bookingsRepository.findOne.mockResolvedValue(booking);
      bookingsRepository.save.mockImplementation((b: Booking) =>
        Promise.resolve(b),
      );

      const result = await service.cancel(bookingId, userId, dto);

      expect(bookingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BookingStatus.CANCELLED,
          cancelReason: dto.reason,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AppEvent.BOOKING_STATUS_CHANGED,
        expect.objectContaining({
          bookingId,
          oldStatus: BookingStatus.PENDING,
          newStatus: BookingStatus.CANCELLED,
        }),
      );
      expect(result.message).toEqual('messages.BOOKING.CANCEL_SUCCESS');
    });

    it('should throw NotFoundException if the booking does not exist', async () => {
      bookingsRepository.findOne.mockResolvedValue(null);

      await expect(service.cancel(bookingId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if the booking belongs to another user', async () => {
      bookingsRepository.findOne.mockResolvedValue(
        buildBooking({ userId: 'someone-else' }),
      );

      await expect(service.cancel(bookingId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if the booking is already in a terminal status', async () => {
      bookingsRepository.findOne.mockResolvedValue(
        buildBooking({ status: BookingStatus.CANCELLED }),
      );

      await expect(service.cancel(bookingId, userId, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(bookingsRepository.save).not.toHaveBeenCalled();
    });
  });
});
