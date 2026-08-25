import { Review } from '../entities/review.entity';

// Dùng cho các endpoint đánh giá KHÔNG yêu cầu đăng nhập (GET /reviews,
// GET /rooms/:roomId/reviews) — khác ReviewResponseDto (dùng cho GET
// /reviews/me và GET /admin/reviews), vốn lộ bookingId/roomId/userId/
// user.id ra ngoài. Đây là các internal identifier không cần thiết cho
// carousel/danh sách đánh giá công khai (Luật 5 — API public và API
// admin/user không dùng chung ResponseDTO nếu phạm vi dữ liệu khác nhau).
export class PublicReviewAuthorDto {
  fullName!: string | null;
  avatarUrl!: string | null;
}

export class PublicReviewResponseDto {
  id!: string;
  rating!: number;
  comment!: string | null;
  // `review.createdAt` is typed optional on the entity only because
  // TypeORM's @CreateDateColumn is unset before the first insert — every
  // Review this DTO is ever constructed from (findAllPublic()/findByRoom())
  // has already been fetched from the DB, so it's always present here.
  createdAt!: Date;
  author?: PublicReviewAuthorDto;

  constructor(review: Review) {
    this.id = review.id;
    this.rating = review.rating;
    this.comment = review.comment ?? null;
    this.createdAt = review.createdAt as Date;
    if (review.user) {
      const author = new PublicReviewAuthorDto();
      author.fullName = review.user.fullName ?? null;
      author.avatarUrl = review.user.avatarUrl ?? null;
      this.author = author;
    }
  }
}
