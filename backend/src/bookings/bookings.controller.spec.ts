import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { DataSource } from 'typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Room } from '../rooms/entities/room.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('BookingsController', () => {
  let controller: BookingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
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
        { provide: DataSource, useValue: {} },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
