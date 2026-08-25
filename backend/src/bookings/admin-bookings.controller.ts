import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EntityIdParamDto } from '../common/dto/entity-id-param.dto';
import { AdminBookingQueryDto } from './dto/admin-booking-query.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { BookingStatus } from './enums/booking-status.enum';
import { SortOrder } from '../common/enums/sort-order.enum';

// Quản lý booking cho Admin — tách controller riêng khỏi BookingsController
// (self-service của khách) nhưng dùng chung 1 BookingsService, đúng pattern
// đã có ở rooms/ (RoomsController + AdminRoomsController). Khác route
// customer: GET /admin/bookings/:id KHÔNG giới hạn theo chủ sở hữu.
@ApiTags('Admin - Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách booking' })
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
    enum: BookingStatus,
    description: 'Lọc theo trạng thái booking',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Tìm theo tên/email khách, tên/số phòng, hoặc mã booking',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: SortOrder,
    description: 'Sắp xếp theo thời gian tạo (mặc định DESC - mới nhất trước)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách booking (đã phân trang)',
  })
  @ApiResponse({ status: 400, description: 'Tham số truy vấn không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  findAll(@Query() query: AdminBookingQueryDto) {
    return this.bookingsService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '[Admin] Xem chi tiết 1 booking (không giới hạn theo chủ sở hữu)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID booking',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Trả về thông tin booking' })
  @ApiResponse({ status: 400, description: 'ID booking không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  findOne(@Param() params: EntityIdParamDto) {
    return this.bookingsService.findOneForAdmin(params.id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: '[Admin] Chấp nhận yêu cầu đặt phòng' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID booking',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Chấp nhận thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({
    status: 409,
    description:
      'Booking không ở trạng thái PENDING, hoặc hold giữ chỗ đã hết hạn',
  })
  accept(@Param() params: EntityIdParamDto) {
    return this.bookingsService.accept(params.id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: '[Admin] Từ chối yêu cầu đặt phòng' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID booking',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({
    status: 409,
    description:
      'Booking không ở trạng thái PENDING, hoặc hold giữ chỗ đã hết hạn',
  })
  reject(@Param() params: EntityIdParamDto, @Body() dto: RejectBookingDto) {
    return this.bookingsService.reject(params.id, dto);
  }
}
