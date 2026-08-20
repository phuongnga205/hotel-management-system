import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Room } from '../rooms/entities/room.entity';

describe('BookingsService', () => {
  let service: BookingsService;
  let i18nService: { t: jest.Mock };

  beforeEach(async () => {
    i18nService = { t: jest.fn((key: string) => key) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {},
        },
        {
          provide: I18nService,
          useValue: i18nService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
