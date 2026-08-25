import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

import { Booking } from '../bookings/entities/booking.entity';
import { I18nService } from 'nestjs-i18n';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { PostgresErrorCode } from '../common/enums/postgres-error-code.enum';
import { SortOrder } from '../common/enums/sort-order.enum';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { REVIEW_ADMIN_DELETE_REASON } from './reviews.constants';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly i18n: I18nService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
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
    const { page, limit, sortOrder = SortOrder.DESC } = query;

    const [reviews, total] = await this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      // Thieu join nay truoc day khien review.room luon undefined -
      // AdminReviewListPage.tsx doc review.room?.name nhung khong bao gio
      // co du lieu (khong phai bug fallback anh, nhung cung dang bug "thieu
      // relation" - phat hien khi ra soat cac cho join room/room.images).
      .leftJoinAndSelect('review.room', 'room')
      .orderBy('review.createdAt', sortOrder)
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

  // GET /reviews/me — self-service, gộp đánh giá của chính user hiện tại
  // từ mọi phòng (khác findByRoom() ở trên: công khai + scope theo 1
  // phòng cụ thể qua URL param). Join kèm room + room.images để FE hiện
  // được tên/ảnh phòng ngay trong danh sách, không phải gọi thêm request
  // nào khác (tránh N+1 — Luật 4, cùng pattern PaymentsService.findAllForUser()).
  async findAllForUser(userId: string, query: ReviewQueryDto) {
    const { page, limit } = query;

    const [reviews, total] = await this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.room', 'room')
      // 'roomImage.deletedAt IS NULL' - Image la soft-delete (@DeleteDateColumn),
      // JOIN khong tu loai anh da xoa; thieu dieu kien nay 1 anh thumbnail cu
      // da bi xoa van lot vao room.images va ReviewResponseDto co the chon
      // nham no (URL hong) hoac khong tim thay anh isThumbnail nao con ->
      // FE lai roi ve fallback, dung pattern loi da gap o BookingsService.
      .leftJoinAndSelect(
        'room.images',
        'roomImage',
        'roomImage.deletedAt IS NULL',
      )
      .where('review.userId = :userId', { userId })
      .orderBy('review.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.REVIEWS.FIND_MINE_SUCCESS'),
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
    const review = await this.reviewRepository.findOne({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      throw new NotFoundException(this.i18n.t('messages.REVIEWS.NOT_FOUND'));
    }

    // DELETE không nhận lý do từ client (xem docs mục "Admin — Reviews") —
    // email thông báo cho user luôn dùng 1 template cố định.
    review.deleteReason = REVIEW_ADMIN_DELETE_REASON;

    await this.reviewRepository.softRemove(review);

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
