import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { DataSource } from 'typeorm';
import { AdminBookingsController } from './admin-bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Room } from '../rooms/entities/room.entity';

describe('AdminBookingsController', () => {
  let controller: AdminBookingsController;
  const bookingsService = {
    findAllForAdmin: jest.fn(),
    findOneForAdmin: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBookingsController],
      providers: [
        { provide: BookingsService, useValue: bookingsService },
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
      ],
    }).compile();

    controller = module.get<AdminBookingsController>(AdminBookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll to bookingsService.findAllForAdmin', () => {
    const query = { page: 1, limit: 10 };
    void controller.findAll(query);
    expect(bookingsService.findAllForAdmin).toHaveBeenCalledWith(query);
  });

  it('delegates accept to bookingsService.accept', () => {
    void controller.accept({ id: '1' });
    expect(bookingsService.accept).toHaveBeenCalledWith('1');
  });

  it('delegates reject to bookingsService.reject with the reason DTO', () => {
    const dto = { cancelReason: 'no vacancy' };
    void controller.reject({ id: '1' }, dto);
    expect(bookingsService.reject).toHaveBeenCalledWith('1', dto);
  });
});
