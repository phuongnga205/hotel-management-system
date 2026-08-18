import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { AppEvent } from '../common/events/event-names.constants';
import { ReviewDeletedEvent } from '../common/events/review-deleted.event';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    private readonly i18n: I18nService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  create(createReviewDto: CreateReviewDto) {
    void createReviewDto;
    return 'This action adds a new review';
  }

  findAll() {
    return `This action returns all reviews`;
  }

  findOne(id: string) {
    return `This action returns a #${id} review`;
  }

  update(id: string, updateReviewDto: UpdateReviewDto) {
    void updateReviewDto;
    return `This action updates a #${id} review`;
  }

  remove(id: string) {
    return `This action removes a #${id} review`;
  }

  // Admin xoá đánh giá (vi phạm quy định) — dùng xoá mềm, và báo cho chủ
  // review qua email (event ReviewDeleted, xem backend/docs/DANH_SACH_API.md mục 12).
  async adminDelete(id: string) {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!review) {
      throw new NotFoundException(this.i18n.t('messages.REVIEWS.NOT_FOUND'));
    }

    await this.reviewsRepository.softDelete(id);

    if (review.user) {
      this.eventEmitter.emit(
        AppEvent.REVIEW_DELETED,
        new ReviewDeletedEvent(
          review.id,
          review.user.id,
          review.user.email,
          review.user.username,
        ),
      );
    }

    return {
      message: this.i18n.t('messages.REVIEWS.ADMIN_DELETE_SUCCESS'),
    };
  }
}
