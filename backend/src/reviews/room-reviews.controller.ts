import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReviewQueryDto } from './dto/review-query.dto';
import { RoomIdParamDto } from './dto/room-id-param.dto';

// Route nested dưới /rooms để khớp FE (frontend/src/api/endpoints.ts
// ROOM_REVIEWS) và docs mục "Reviews (user)" — sở hữu bởi ReviewsModule vì
// đọc trực tiếp Review repository, không phải RoomsModule.
@ApiTags('Reviews')
@Controller('rooms/:roomId/reviews')
export class RoomReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Công khai — không yêu cầu đăng nhập, phục vụ trang chi tiết phòng cho
  // cả khách chưa đăng nhập (xem docs mục "Reviews (user)").
  @Get()
  @ApiOperation({ summary: 'Xem đánh giá công khai theo phòng' })
  @ApiParam({
    name: 'roomId',
    type: String,
    description: 'ID phòng',
    example: '1',
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
    description: 'Trả về danh sách đánh giá của phòng (đã phân trang)',
  })
  @ApiResponse({
    status: 400,
    description: 'ID phòng hoặc tham số phân trang không hợp lệ',
  })
  async findByRoom(
    @Param() params: RoomIdParamDto,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findByRoom(params.roomId, query);
  }
}
