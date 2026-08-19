import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('AdminReviewsController', () => {
  let controller: AdminReviewsController;
  let reviewsService: { adminDelete: jest.Mock };

  beforeEach(async () => {
    reviewsService = { adminDelete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: reviewsService,
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminReviewsController>(AdminReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('remove() should delegate to ReviewsService.adminDelete', async () => {
    reviewsService.adminDelete.mockResolvedValue({ message: 'ok' });

    const result = await controller.remove('5');

    expect(reviewsService.adminDelete).toHaveBeenCalledWith('5');
    expect(result).toEqual({ message: 'ok' });
  });
});
