import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

describe('ReviewsController', () => {
  const reviewsService = {
    create: jest.fn(),
  };

  let controller: ReviewsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReviewsController(
      reviewsService as unknown as ReviewsService,
    );
  });

  it('creates a review scoped to the authenticated user (userId from JWT, not body)', async () => {
    reviewsService.create.mockResolvedValue({ statusCode: 201 });
    const dto: CreateReviewDto = { bookingId: '10', rating: 5 };

    await controller.create('1', dto);

    expect(reviewsService.create).toHaveBeenCalledWith('1', dto);
  });
});
