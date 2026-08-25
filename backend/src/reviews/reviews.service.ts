import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

import { Booking } from '../bookings/entities/booking.entity';
import { I18nService } from 'nestjs-i18n';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { PostgresErrorCode } from '../common/enums/postgres-error-code.enum';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { REVIEW_ADMIN_DELETE_REASON } from './reviews.constants';
import { TransactionalMailService } from '../mail/transactional-mail.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly i18n: I18nService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly mailService: TransactionalMailService,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const { bookingId, rating, comment } = createReviewDto;

    // 1. Tìm booking của chính user đang đăng nhập
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
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }

    const hasPaidPayment = booking.payments?.some(
      (payment) => payment.status === PaymentStatus.SUCCESS,
    );

    // 2. Chỉ được review sau khi đã ở xong
    if (
      booking.status !== BookingStatus.ACCEPTED ||
      !hasPaidPayment ||
      new Date() < new Date(booking.checkOutDate)
    ) {
      throw new BadRequestException(
        this.i18n.t('messages.REVIEWS.BOOKING_NOT_COMPLETED'),
      );
    }

    // 3. Không cho review 2 lần
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

    // 4. Tạo review
    const review = this.reviewRepository.create({
      bookingId: booking.id,
      roomId: booking.roomId,
      userId: booking.userId,
      rating,
      comment,
    });

    let saved: Review;
    try {
      saved = await this.reviewRepository.save(review);
    } catch (error) {
      if (this.isDuplicateReviewConflict(error)) {
        throw new ConflictException(
          this.i18n.t('messages.REVIEWS.ALREADY_REVIEWED'),
        );
      }

      throw error;
    }

    return {
      statusCode: 201,
      message: this.i18n.t('messages.REVIEWS.CREATE_SUCCESS'),
      data: new ReviewResponseDto(saved),
    };
  }

  async findAll(query: ReviewQueryDto) {
    const { page, limit } = query;

    const [reviews, total] = await this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .orderBy('review.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.REVIEWS.FIND_ALL_SUCCESS'),
      data: {
        items: reviews.map((review) => new ReviewResponseDto(review)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByRoom(roomId: string, query: ReviewQueryDto) {
    const { page, limit } = query;

    const [reviews, total] = await this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.roomId = :roomId', { roomId })
      .orderBy('review.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.REVIEWS.FIND_BY_ROOM_SUCCESS'),
      data: {
        items: reviews.map((review) => new ReviewResponseDto(review)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(reviewId: string) {
    await this.dataSource.transaction(async (manager) => {
      const reviewRepository = manager.getRepository(Review);
      const review = await reviewRepository.findOne({
        where: { id: reviewId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!review) {
        throw new NotFoundException(this.i18n.t('messages.REVIEWS.NOT_FOUND'));
      }

      const user = await manager
        .getRepository(User)
        .findOneByOrFail({ id: review.userId });

      // DELETE không nhận lý do từ client (xem docs mục "Admin — Reviews") —
      // email thông báo cho user luôn dùng 1 template cố định.
      review.deleteReason = REVIEW_ADMIN_DELETE_REASON;
      await reviewRepository.softRemove(review);
      await this.mailService.createReviewDeletedOutbox(manager, user.email);
    });

    return {
      statusCode: 200,
      message: this.i18n.t('messages.REVIEWS.DELETE_SUCCESS'),
      data: null,
    };
  }

  private isDuplicateReviewConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = error.driverError as { code?: string };
    return driverError.code === PostgresErrorCode.UNIQUE_VIOLATION;
  }
}
