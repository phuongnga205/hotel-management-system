import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { DataSource, QueryFailedError } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { RoomStatus } from '../rooms/enums/room-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/enums/payment-method.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { BOOKING_HOLD_MINUTES } from './constants/booking.constants';

function chainableQueryBuilder(overrides: Record<string, unknown> = {}) {
  const qb: Record<string, unknown> = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    ...overrides,
  };
  return qb;
}

describe('BookingsService', () => {
  let service: BookingsService;
  const findOneBooking = jest.fn();
  const saveBooking = jest.fn();
  const findOneRoom = jest.fn();
  const createQueryBuilder = jest.fn();

  const paymentManagerRepo = {
    create: jest.fn((payload: Partial<Payment>) => payload),
    save: jest.fn((payload: Partial<Payment>) =>
      Promise.resolve({ id: 'p1', ...payload }),
    ),
  };
  const bookingManagerRepo = {
    findOne: jest.fn(),
    save: jest.fn((payload: Partial<Booking>) => Promise.resolve(payload)),
  };
  const dataSource = {
    transaction: jest.fn((cb: (manager: unknown) => unknown) =>
      cb({
        getRepository: (entity: unknown) =>
          entity === Payment ? paymentManagerRepo : bookingManagerRepo,
      }),
    ),
    getRepository: jest.fn(() => ({
      createQueryBuilder: () =>
        chainableQueryBuilder({ getMany: jest.fn().mockResolvedValue([]) }),
    })),
  };

  const room: Room = {
    id: '5',
    roomNumber: '101',
    name: 'Deluxe Room',
    roomType: null,
    description: null,
    viewType: null,
    capacity: 2,
    pricePerNight: 1000000,
    status: RoomStatus.ACTIVE,
  };

  const createDto = {
    roomId: '5',
    checkInDate: '2026-09-01',
    checkOutDate: '2026-09-04',
    note: 'extra towels',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-21T00:00:00+07:00'));
    createQueryBuilder.mockReturnValue(chainableQueryBuilder());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: findOneBooking,
            save: saveBooking,
            createQueryBuilder,
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            findOne: findOneRoom,
          },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: I18nService,
          useValue: { t: (key: string) => key },
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a booking, calculates total price and sets a 10-minute hold', async () => {
    findOneRoom.mockResolvedValue(room);
    let savedPayload: Booking | undefined;
    saveBooking.mockImplementation((payload: Booking) => {
      savedPayload = payload;
      return Promise.resolve({
        ...payload,
        id: '1',
        status: BookingStatus.PENDING,
      });
    });

    const result = await service.create(createDto, '10');

    expect(result).toMatchObject({
      statusCode: 201,
      data: {
        id: '1',
        totalPrice: 3000000,
        pricePerNight: 1000000,
        room: { id: '5', name: 'Deluxe Room', roomNumber: '101' },
      },
    });
    expect(savedPayload?.holdExpiresAt).toEqual(
      new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000),
    );
  });

  it('maps an exclusion constraint to ConflictException', async () => {
    findOneRoom.mockResolvedValue(room);
    saveBooking.mockRejectedValue(
      new QueryFailedError('INSERT', [], { code: '23P01' } as unknown as Error),
    );

    await expect(service.create(createDto, '10')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects booking a room that is not ACTIVE', async () => {
    findOneRoom.mockResolvedValue({
      ...room,
      status: RoomStatus.MAINTENANCE,
    });

    await expect(service.create(createDto, '10')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(saveBooking).not.toHaveBeenCalled();
  });

  it('throws when the room does not exist', async () => {
    findOneRoom.mockResolvedValue(null);

    await expect(service.create(createDto, '10')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects create when QueryBuilder finds an overlapping booking', async () => {
    findOneRoom.mockResolvedValue(room);
    const qb = chainableQueryBuilder({
      getOne: jest.fn().mockResolvedValue({ id: '99' }),
    });
    createQueryBuilder.mockReturnValue(qb);

    await expect(service.create(createDto, '10')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(saveBooking).not.toHaveBeenCalled();
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      'booking.id != :excludeBookingId',
      expect.anything(),
    );
  });

  it('rejects update when dates overlap another booking (excluding itself)', async () => {
    bookingManagerRepo.findOne.mockResolvedValue({
      id: '1',
      userId: '10',
      roomId: '5',
      checkInDate: '2026-09-01',
      checkOutDate: '2026-09-04',
      pricePerNight: 1000000,
      totalPrice: 3000000,
      status: BookingStatus.PENDING,
    });
    findOneRoom.mockResolvedValue(room);
    const qb = chainableQueryBuilder({
      getOne: jest.fn().mockResolvedValue({ id: '2' }),
    });
    createQueryBuilder.mockReturnValue(qb);

    await expect(
      service.update('1', '10', {
        checkInDate: '2026-09-02',
        checkOutDate: '2026-09-05',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(bookingManagerRepo.save).not.toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith(
      'booking.id != :excludeBookingId',
      { excludeBookingId: '1' },
    );
  });

  it('applies note when updating a pending booking', async () => {
    bookingManagerRepo.findOne.mockResolvedValue({
      id: '1',
      userId: '10',
      roomId: '5',
      checkInDate: '2026-09-01',
      checkOutDate: '2026-09-04',
      pricePerNight: 1000000,
      totalPrice: 3000000,
      status: BookingStatus.PENDING,
      note: 'old note',
    });
    findOneRoom.mockResolvedValue(room);

    await expect(
      service.update('1', '10', { note: 'new note' }),
    ).resolves.toEqual({
      statusCode: 200,
      message: 'messages.BOOKING.UPDATED_SUCCESS',
    });
    expect(bookingManagerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'new note' }),
    );
  });

  describe('pay()', () => {
    it('creates a SUCCESS payment and confirms the booking within 1 transaction', async () => {
      bookingManagerRepo.findOne.mockResolvedValue({
        id: '1',
        userId: '10',
        totalPrice: 3000000,
        status: BookingStatus.PENDING,
      });

      const result = await service.pay('1', '10', {
        method: PaymentMethod.VNPAY,
      });

      expect(result).toEqual({
        statusCode: 201,
        message: 'messages.BOOKING.PAY_SUCCESS',
      });
      expect(paymentManagerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: '1',
          amount: '3000000',
          method: PaymentMethod.VNPAY,
          status: PaymentStatus.SUCCESS,
        }),
      );
      expect(bookingManagerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BookingStatus.ACCEPTED,
          holdExpiresAt: null,
        }),
      );
    });

    it('rejects paying a booking that is not PENDING', async () => {
      bookingManagerRepo.findOne.mockResolvedValue({
        id: '1',
        userId: '10',
        totalPrice: 3000000,
        status: BookingStatus.ACCEPTED,
      });

      await expect(
        service.pay('1', '10', { method: PaymentMethod.CASH }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(paymentManagerRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the booking does not belong to the user', async () => {
      bookingManagerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.pay('1', '10', { method: PaymentMethod.CASH }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('admin actions', () => {
    it('accepts a PENDING booking and clears the hold', async () => {
      bookingManagerRepo.findOne.mockResolvedValue({
        id: '1',
        status: BookingStatus.PENDING,
        holdExpiresAt: new Date(),
      });

      await expect(service.accept('1')).resolves.toEqual({
        statusCode: 200,
        message: 'messages.BOOKING.ACCEPT_SUCCESS',
      });
      expect(bookingManagerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BookingStatus.ACCEPTED,
          holdExpiresAt: null,
        }),
      );
      // Khoá pessimistic_write (SELECT ... FOR UPDATE) để chống race với
      // reject()/pay() chạy song song trên cùng booking.
      expect(bookingManagerRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });

    it('rejects accepting a booking that is not PENDING', async () => {
      bookingManagerRepo.findOne.mockResolvedValue({
        id: '1',
        status: BookingStatus.ACCEPTED,
      });

      await expect(service.accept('1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a PENDING booking with a reason', async () => {
      bookingManagerRepo.findOne.mockResolvedValue({
        id: '1',
        status: BookingStatus.PENDING,
      });

      await expect(
        service.reject('1', { cancelReason: 'no vacancy' }),
      ).resolves.toEqual({
        statusCode: 200,
        message: 'messages.BOOKING.REJECT_SUCCESS',
      });
      expect(bookingManagerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BookingStatus.REJECTED,
          cancelReason: 'no vacancy',
        }),
      );
    });

    it('lists bookings for admin using offset/limit, not skip/take', async () => {
      const qb = chainableQueryBuilder({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      createQueryBuilder.mockReturnValue(qb);

      await service.findAllForAdmin({ page: 2, limit: 10 });

      expect(qb.offset).toHaveBeenCalledWith(10);
      expect(qb.limit).toHaveBeenCalledWith(10);
      expect(qb.skip).not.toHaveBeenCalled();
      expect(qb.take).not.toHaveBeenCalled();
    });
  });

  describe('expireStaleHolds()', () => {
    it('bulk-updates stale PENDING holds to EXPIRED via QueryBuilder', async () => {
      const qb = chainableQueryBuilder();
      createQueryBuilder.mockReturnValue(qb);

      await service.expireStaleHolds();

      expect(qb.update).toHaveBeenCalled();
      expect(qb.set).toHaveBeenCalledWith({
        status: BookingStatus.EXPIRED,
        holdExpiresAt: null,
      });
      expect(qb.execute).toHaveBeenCalled();
    });
  });
});
