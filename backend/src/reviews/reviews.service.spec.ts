import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';
import { REVIEW_ADMIN_DELETE_REASON } from './reviews.constants';

describe('ReviewsService', () => {
  const i18n = { t: jest.fn((key: string) => key) };

  const reviewRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const bookingRepository = {
    findOne: jest.fn(),
  };

  let service: ReviewsService;

  const createDto: CreateReviewDto = { bookingId: '10', rating: 5 };

  const acceptedBooking: Booking = {
    id: '10',
    userId: '1',
    roomId: '5',
    checkInDate: '2026-01-01',
    checkOutDate: '2026-01-02',
    pricePerNight: new Decimal(1500000),
    totalPrice: new Decimal(1500000),
    status: BookingStatus.ACCEPTED,
    payments: [{ status: PaymentStatus.SUCCESS } as Payment],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewsService(
      reviewRepository as unknown as Repository<Review>,
      i18n as unknown as I18nService,
      bookingRepository as unknown as Repository<Booking>,
    );
  });

  function mockQueryBuilder(reviews: Review[], total: number) {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([reviews, total]),
    };
    reviewRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  describe('create', () => {
    it('throws NotFoundException when the booking does not belong to the user', async () => {
      bookingRepository.findOne.mockResolvedValue(null);

      await expect(service.create('1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the booking has not been paid and completed', async () => {
      bookingRepository.findOne.mockResolvedValue({
        ...acceptedBooking,
        status: BookingStatus.PENDING,
      });

      await expect(service.create('1', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the stay has not finished yet', async () => {
      bookingRepository.findOne.mockResolvedValue({
        ...acceptedBooking,
        checkOutDate: '2999-01-01',
      });

      await expect(service.create('1', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException when the booking already has a review', async () => {
      bookingRepository.findOne.mockResolvedValue(acceptedBooking);
      reviewRepository.findOne.mockResolvedValue({ id: '1' });

      await expect(service.create('1', createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates the review without a status field and returns the 201 envelope', async () => {
      bookingRepository.findOne.mockResolvedValue(acceptedBooking);
      reviewRepository.findOne.mockResolvedValue(null);
      reviewRepository.create.mockImplementation((value: unknown) => value);
      reviewRepository.save.mockResolvedValue({
        id: '1',
        bookingId: '10',
        roomId: '5',
        userId: '1',
        rating: 5,
        comment: 'Great stay',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      });

      const result = await service.create('1', {
        bookingId: '10',
        rating: 5,
        comment: 'Great stay',
      });

      expect(reviewRepository.create).toHaveBeenCalledWith({
        bookingId: '10',
        roomId: '5',
        userId: '1',
        rating: 5,
        comment: 'Great stay',
      });
      expect(result).toMatchObject({
        statusCode: 201,
        data: { id: '1', rating: 5 },
      });
    });

    it('converts a unique-violation DB error into ConflictException', async () => {
      bookingRepository.findOne.mockResolvedValue(acceptedBooking);
      reviewRepository.findOne.mockResolvedValue(null);
      reviewRepository.create.mockImplementation((value: unknown) => value);
      reviewRepository.save.mockRejectedValue(
        new QueryFailedError(
          'insert',
          [],
          Object.assign(new Error('duplicate key'), { code: '23505' }),
        ),
      );

      await expect(service.create('1', createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('paginates using offset/limit (not skip/take)', async () => {
      const qb = mockQueryBuilder(
        [{ id: '1', rating: 5, comment: null } as Review],
        1,
      );

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(qb.offset).toHaveBeenCalledWith(10);
      expect(qb.limit).toHaveBeenCalledWith(10);
      expect(qb.skip).not.toHaveBeenCalled();
      expect(qb.take).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        statusCode: 200,
        data: { total: 1, page: 2, limit: 10, totalPages: 1 },
      });
    });
  });

  describe('findByRoom', () => {
    it('filters by roomId and paginates using offset/limit', async () => {
      const qb = mockQueryBuilder([], 0);

      await service.findByRoom('5', { page: 1, limit: 10 });

      expect(qb.where).toHaveBeenCalledWith('review.roomId = :roomId', {
        roomId: '5',
      });
      expect(qb.offset).toHaveBeenCalledWith(0);
      expect(qb.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the review does not exist', async () => {
      reviewRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });

    it('does not accept a client-supplied reason — always records the fixed admin reason', async () => {
      const review = { id: '1' } as Review;
      reviewRepository.findOne.mockResolvedValue(review);
      reviewRepository.softRemove.mockResolvedValue(review);

      const result = await service.remove('1');

      expect(review.deleteReason).toBe(REVIEW_ADMIN_DELETE_REASON);
      expect(reviewRepository.softRemove).toHaveBeenCalledWith(review);
      expect(result).toEqual({
        statusCode: 200,
        message: 'messages.REVIEWS.DELETE_SUCCESS',
        data: null,
      });
    });
  });
});
