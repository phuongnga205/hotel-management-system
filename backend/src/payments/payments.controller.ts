import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentStatus } from './enums/payment-status.enum';

// Self-service cho chính khách hàng đã đăng nhập — luôn scope theo userId
// lấy từ JWT (@GetUser), không nhận từ query (Luật 5). Xem
// AdminPaymentsController cho phần quản lý của Admin (không giới hạn theo
// chủ sở hữu, kèm thêm thông tin khách/phòng). Chỉ có API đọc danh sách,
// chưa có API xem chi tiết 1 giao dịch riêng — FE hiện chưa dựng trang này,
// xem TODO ở backend/docs/DANH_SACH_API.md mục 4a.
@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Xem lịch sử thanh toán của chính mình',
    description:
      'Trả về toàn bộ giao dịch thanh toán của user hiện tại, gộp từ mọi booking (không giới hạn theo 1 booking cụ thể).',
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
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Lọc theo trạng thái thanh toán',
  })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: PaymentMethod,
    description: 'Lọc theo phương thức thanh toán',
  })
  @ApiResponse({
    status: 200,
    description:
      'Trả về danh sách giao dịch thanh toán của chính mình (đã phân trang)',
  })
  @ApiResponse({ status: 400, description: 'Tham số truy vấn không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  findMine(@GetUser('id') userId: string, @Query() query: PaymentQueryDto) {
    return this.paymentsService.findAllForUser(userId, query);
  }
}
