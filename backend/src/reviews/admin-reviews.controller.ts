import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReviewQueryDto } from './dto/review-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EntityIdParamDto } from '../common/dto/entity-id-param.dto';

@ApiTags('Admin - Reviews')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Xem danh sách đánh giá (toàn hệ thống)' })
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
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  async findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[Admin] Xoá đánh giá',
    description:
      'Xoá mềm, không nhận body/lý do — email thông báo cho user dùng 1 template cố định.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID đánh giá',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Xoá thành công' })
  @ApiResponse({ status: 400, description: 'ID đánh giá không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
  async remove(@Param() params: EntityIdParamDto) {
    return this.reviewsService.remove(params.id);
  }
}
