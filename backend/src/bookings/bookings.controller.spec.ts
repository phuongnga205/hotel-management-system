import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

describe('BookingsController', () => {
  let controller: BookingsController;
  let bookingsService: { cancel: jest.Mock };

  beforeEach(async () => {
    bookingsService = { cancel: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: bookingsService,
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('cancel() should call BookingsService.cancel with id, userId from JWT and body', async () => {
    const dto = { reason: 'Đổi lịch trình cá nhân' };
    bookingsService.cancel.mockResolvedValue({ message: 'ok' });

    const result = await controller.cancel('10', '1', dto);

    expect(bookingsService.cancel).toHaveBeenCalledWith('10', '1', dto);
    expect(result).toEqual({ message: 'ok' });
  });
});
