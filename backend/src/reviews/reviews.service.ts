import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Review } from './entities/review.entity';
import { ReviewStatus } from './enums/review-status.enum';
import { CreateReviewDto } from './dto/create-review.dto';

import { Booking } from '../bookings/entities/booking.entity';
import { I18nService } from 'nestjs-i18n';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewDeleteDto } from './dto/review-delete.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly i18n: I18nService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) { }

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const { bookingId, rating, comment } = createReviewDto;

    // 1. Kiểm tra rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException(this.i18n.t("messages.REVIEWS.RATING_RANGE_INVALID"));
    }

    // 2. Tìm booking của chính user đang đăng nhập
    const booking = await this.bookingRepository.findOne({
      where: {
        id: bookingId,
        userId,
      },
      relations: {
        payments: true,
      },
    });


    if (!booking) {
      throw new NotFoundException(
        this.i18n.t("messages.BOOKING.NOT_FOUND"),
      );
    }

    const hasPaidPayment = booking.payments?.some(
      (payment) => payment.status === PaymentStatus.SUCCESS,
    );

    // 3. Chỉ được review sau khi đã ở xong
    if (
      booking.status !== BookingStatus.ACCEPTED ||
      !hasPaidPayment ||
      new Date() < new Date(booking.checkOutDate)
    ) {
      throw new BadRequestException(
        this.i18n.t('messages.REVIEWS.BOOKING_NOT_COMPLETED'),
      );
    }

    // 4. Không cho review 2 lần
    const existingReview = await this.reviewRepository.findOne({
      where: {
        bookingId: booking.id,
      },
      withDeleted: false,
    });

    if (existingReview) {
      throw new ConflictException(
        this.i18n.t('messages.REVIEWS.ALREADY_REVIEWED'),
      );
    }

    // 5. Tạo review
    const review = this.reviewRepository.create({
      bookingId: booking.id,
      roomId: booking.roomId,
      userId: booking.userId,
      rating,
      comment,
      status: ReviewStatus.PUBLISHED,
    });

    try {
      return await this.reviewRepository.save(review);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).driverError?.code === '23505'
      ) {
        throw new ConflictException(
          this.i18n.t('messages.REVIEWS.ALREADY_REVIEWED'),
        );
      }

      throw error;
    }
  }

  async findAll(query: ReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [reviews, total] = await queryBuilder.getManyAndCount();

    return {
      data: reviews.map(
        (review) => new ReviewResponseDto(review),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByRoom(roomId: string, query: ReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.roomId = :roomId', { roomId })
      .andWhere('review.status = :status', {
        status: ReviewStatus.PUBLISHED,
      })
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [reviews, total] = await qb.getManyAndCount();

    return {
      data: reviews.map(
        (review) => new ReviewResponseDto(review)),
        meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(
    reviewId: string,
    deleteDto: ReviewDeleteDto,
  ) {
    const review = await this.reviewRepository.findOne({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      throw new NotFoundException(
        this.i18n.t('messages.REVIEWS.NOT_FOUND'),
      );
    }

    if (!deleteDto.deleteReason?.trim()) {
      throw new BadRequestException(
        this.i18n.t('messages.REVIEWS.DELETE_REASON_REQUIRED'),
      );
    }

    review.deleteReason = deleteDto.deleteReason.trim();

    await this.reviewRepository.softRemove(review);

    return {
      message: this.i18n.t('messages.REVIEWS.DELETE_SUCCESS'),
    };
  }
}