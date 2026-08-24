import { RoomReviewsController } from './room-reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewQueryDto } from './dto/review-query.dto';
import { RoomIdParamDto } from './dto/room-id-param.dto';

describe('RoomReviewsController', () => {
  const reviewsService = {
    findByRoom: jest.fn(),
  };

  let controller: RoomReviewsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new RoomReviewsController(
      reviewsService as unknown as ReviewsService,
    );
  });

  it('findByRoom does not require the caller to be authenticated (no guard on the route)', async () => {
    reviewsService.findByRoom.mockResolvedValue({ statusCode: 200 });
    const params: RoomIdParamDto = { roomId: '5' };
    const query: ReviewQueryDto = { page: 1, limit: 10 };

    await controller.findByRoom(params, query);

    expect(reviewsService.findByRoom).toHaveBeenCalledWith('5', query);
  });
});
