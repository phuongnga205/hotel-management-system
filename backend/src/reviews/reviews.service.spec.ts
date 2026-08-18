import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { AppEvent } from '../common/events/event-names.constants';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewsRepository: { findOne: jest.Mock; softDelete: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    reviewsRepository = { findOne: jest.fn(), softDelete: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useValue: reviewsRepository,
        },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('adminDelete', () => {
    const reviewId = '5';
    const mockReview = {
      id: reviewId,
      user: { id: '1', email: 'test@mail.com', username: 'test' },
    };

    it('should soft-delete the review and emit ReviewDeleted', async () => {
      reviewsRepository.findOne.mockResolvedValue(mockReview);

      const result = await service.adminDelete(reviewId);

      expect(reviewsRepository.softDelete).toHaveBeenCalledWith(reviewId);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AppEvent.REVIEW_DELETED,
        expect.objectContaining({
          reviewId,
          userId: mockReview.user.id,
          userEmail: mockReview.user.email,
        }),
      );
      expect(result.message).toEqual('messages.REVIEWS.ADMIN_DELETE_SUCCESS');
    });

    it('should throw NotFoundException if the review does not exist', async () => {
      reviewsRepository.findOne.mockResolvedValue(null);

      await expect(service.adminDelete(reviewId)).rejects.toThrow(
        NotFoundException,
      );
      expect(reviewsRepository.softDelete).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
