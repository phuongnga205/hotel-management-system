import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Admin - Reviews')
@ApiBearerAuth()
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Delete(':id')
  @ApiOperation({
    summary: 'Xoá đánh giá (vi phạm quy định)',
    description:
      'Chỉ Admin. Xoá mềm (soft delete), không nhận body/lý do tuỳ chỉnh — dùng 1 template email cố định. Xoá thành công sẽ gửi email báo cho chủ review (event ReviewDeleted).',
  })
  @ApiResponse({ status: 200, description: 'Xoá thành công' })
  @ApiResponse({ status: 403, description: 'Không phải Admin' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
  remove(@Param('id') id: string) {
    return this.reviewsService.adminDelete(id);
  }
}
