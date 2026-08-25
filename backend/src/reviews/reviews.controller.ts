import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Công khai — không yêu cầu đăng nhập, phục vụ carousel "Guest Stories" ở
  // trang chủ (toàn hệ thống, không giới hạn theo 1 phòng như
  // RoomReviewsController). Trước đây không có endpoint nào liệt kê hết
  // review nên HomePage phải fan-out gọi GET /rooms/:id/reviews cho từng
  // phòng mẫu rồi tự gộp lại — dùng cùng truy vấn với ReviewsService.findAll()
  // (admin) nhưng qua findAllPublic(), ánh xạ bằng PublicReviewResponseDto
  // riêng (không phải ReviewResponseDto) vì bản gốc lộ bookingId/roomId/
  // userId/user.id — không cần thiết cho carousel công khai (Luật 5).
  @Get()
  @ApiOperation({ summary: 'Xem đánh giá công khai (toàn hệ thống)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Số trang (bắt đầu từ 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số bản ghi mỗi trang (tối đa 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách đánh giá (đã phân trang)',
  })
  @ApiResponse({ status: 400, description: 'Tham số page/limit không hợp lệ' })
  findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAllPublic(query);
  }

  // Self-service cho chính khách hàng đã đăng nhập — luôn scope theo userId
  // lấy từ JWT (@GetUser), không nhận từ query (Luật 5). Đặt trước @Post()
  // trong file chỉ để dễ đọc, không ảnh hưởng routing (path tĩnh 'me' không
  // đụng path nào khác của controller này).
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: 'Xem đánh giá của chính mình',
    description:
      'Trả về toàn bộ đánh giá user hiện tại đã viết, gộp từ mọi phòng đã ở (không giới hạn theo 1 phòng cụ thể).',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Số trang (bắt đầu từ 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số bản ghi mỗi trang (tối đa 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách đánh giá của chính mình (đã phân trang)',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  findMine(@GetUser('id') userId: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findAllForUser(userId, query);
  }

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
