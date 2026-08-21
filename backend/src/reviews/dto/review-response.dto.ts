import { Review } from '../entities/review.entity';
import { ReviewStatus } from '../enums/review-status.enum';

export class ReviewAuthorDto {
  id!: string;
  fullName!: string | null;
  avatarUrl!: string | null;
}

export class ReviewResponseDto {
  id!: string;
  bookingId!: string;
  roomId!: string;
  userId!: string;
  rating!: number;
  comment!: string | null;
  status!: ReviewStatus;
  createdAt?: Date;
  user?: ReviewAuthorDto;

  constructor(review: Review) {
    this.id = review.id;
    this.bookingId = review.bookingId;
    this.roomId = review.roomId;
    this.userId = review.userId;
    this.rating = review.rating;
    this.comment = review.comment ?? null;
    this.status = review.status;
    this.createdAt = review.createdAt;
    if (review.user) {
      this.user = {
        id: review.user.id,
        fullName: review.user.fullName ?? null,
        avatarUrl: review.user.avatarUrl ?? null,
      };
    }
  }
}
