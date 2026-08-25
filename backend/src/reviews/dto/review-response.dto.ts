import { Review } from '../entities/review.entity';

export class ReviewAuthorDto {
  id!: string;
  fullName!: string | null;
  avatarUrl!: string | null;
}

// Chỉ điền khi relation `review.room` (+ `room.images`) được load kèm —
// dùng cho GET /reviews/me (mục "của mình" gộp từ nhiều phòng, cần biết
// đang nói về phòng nào). GET /rooms/:roomId/reviews không cần field này
// vì FE đã biết sẵn roomId qua URL.
export class ReviewRoomSummaryDto {
  id!: string;
  name!: string;
  roomNumber!: string;
  thumbnailUrl?: string | null;
}

export class ReviewResponseDto {
  id!: string;
  bookingId!: string;
  roomId!: string;
  userId!: string;
  rating!: number;
  comment!: string | null;
  createdAt?: Date;
  user?: ReviewAuthorDto;
  room?: ReviewRoomSummaryDto;

  constructor(review: Review) {
    this.id = review.id;
    this.bookingId = review.bookingId;
    this.roomId = review.roomId;
    this.userId = review.userId;
    this.rating = review.rating;
    this.comment = review.comment ?? null;
    this.createdAt = review.createdAt;
    if (review.user) {
      this.user = {
        id: review.user.id,
        fullName: review.user.fullName ?? null,
        avatarUrl: review.user.avatarUrl ?? null,
      };
    }
    if (review.room) {
      this.room = {
        id: review.room.id,
        name: review.room.name,
        roomNumber: review.room.roomNumber,
        thumbnailUrl:
          review.room.images?.find((image) => image.isThumbnail)?.imageUrl ??
          null,
      };
    }
  }
}
