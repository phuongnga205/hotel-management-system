import { Review } from "../entities/review.entity";

export class ReviewResponseDto {
    id!: string;
    rating!: number;
    comment?: string | null;
    createdAt!: Date;

    user!: {
        id: string;
        fullName: string| null;
    };
    constructor(review: Review) {
        this.id = review.id;
        this.rating = review.rating;
        this.comment = review.comment;
        this.createdAt = review.createdAt!;

        this.user = {
            id: review.user!.id,
            fullName: review.user!.fullName?? null,
        };
    }
}