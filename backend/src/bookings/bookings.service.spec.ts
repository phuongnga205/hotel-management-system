import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { RoomStatus } from '../rooms/enums/room-status.enum';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';

describe('BookingsService', () => {
  let service: BookingsService;
  const findOneBooking = jest.fn();
  const saveBooking = jest.fn();
  const findOneRoom = jest.fn();

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: findOneBooking,
            save: saveBooking,
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            findOne: findOneRoom,
          },
        },
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

  it('creates a booking and calculates total price on the backend', async () => {
    findOneRoom.mockResolvedValue(room);
    saveBooking.mockImplementation(async (payload: Booking) => ({
      ...payload,
      id: '1',
      status: BookingStatus.PENDING,
    }));

    await expect(service.create(createDto, '10')).resolves.toMatchObject({
      id: '1',
      userId: '10',
      roomId: '5',
      totalPrice: 3000000,
      pricePerNight: 1000000,
    });
  });

  it('maps an exclusion constraint to ConflictException', async () => {
    findOneRoom.mockResolvedValue(room);
    saveBooking.mockRejectedValue(
      new QueryFailedError('INSERT', [], { code: '23P01' }),
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

  it('applies note when updating a pending booking', async () => {
    findOneBooking.mockResolvedValue({
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
    saveBooking.mockImplementation(async (payload: Booking) => payload);

    await expect(
      service.update('1', '10', { note: 'new note' }),
    ).resolves.toEqual({
      message: 'messages.BOOKING.UPDATED_SUCCESS',
    });
    expect(saveBooking).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'new note' }),
    );
  });
});
