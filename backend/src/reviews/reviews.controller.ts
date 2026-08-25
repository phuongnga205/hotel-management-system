import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Tạo đánh giá cho phòng đã đặt',
    description:
      'Chỉ tạo được khi booking thuộc về chính user, đã ACCEPTED, đã thanh toán thành công và đã qua checkOutDate. Mỗi booking chỉ review được 1 lần.',
  })
  @ApiResponse({ status: 201, description: 'Tạo đánh giá thành công' })
  @ApiResponse({
    status: 400,
    description:
      'Booking chưa hoàn thành (chưa ACCEPTED/chưa thanh toán/chưa checkout)',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy booking của user này',
  })
  @ApiResponse({ status: 409, description: 'Booking đã được review trước đó' })
  create(
    @GetUser('id') userId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, createReviewDto);
  }
}
