import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewQueryDto } from './dto/review-query.dto';

describe('AdminReviewsController', () => {
  const reviewsService = {
    findAll: jest.fn(),
    remove: jest.fn(),
  };

  let controller: AdminReviewsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminReviewsController(
      reviewsService as unknown as ReviewsService,
    );
  });

  it('findAll forwards the pagination query as-is', async () => {
    reviewsService.findAll.mockResolvedValue({ statusCode: 200 });
    const query: ReviewQueryDto = { page: 1, limit: 10 };

    await controller.findAll(query);

    expect(reviewsService.findAll).toHaveBeenCalledWith(query);
  });

  it('remove takes only the id from the path — no body', async () => {
    reviewsService.remove.mockResolvedValue({ statusCode: 200 });

    await controller.remove({ id: '1' });

    expect(reviewsService.remove).toHaveBeenCalledWith('1');
  });
});
