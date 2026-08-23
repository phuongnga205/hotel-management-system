import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingHistoryQueryDto } from './dto/booking-history-query.dto';
import { PayBookingDto } from './dto/pay-booking.dto';
import { EntityIdParamDto } from '../common/dto/entity-id-param.dto';

// Route ở đây là self-service cho chính khách hàng đã đăng nhập — mọi thao
// tác đều scope theo userId lấy từ JWT (@GetUser), không tin userId từ
// body/param. Xem AdminBookingsController cho phần quản lý của Admin
// (không giới hạn theo chủ sở hữu).
@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Tạo yêu cầu đặt phòng',
    description:
      'Booking tạo ra ở trạng thái PENDING và được giữ chỗ 10 phút (hold) — nếu không được thanh toán hoặc admin accept/reject trong thời gian đó sẽ tự chuyển EXPIRED.',
  })
  @ApiResponse({ status: 201, description: 'Tạo yêu cầu đặt phòng thành công' })
  @ApiResponse({
    status: 400,
    description:
      'Ngày không hợp lệ (checkIn ở quá khứ, checkOut <= checkIn), hoặc phòng không ở trạng thái ACTIVE',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  @ApiResponse({
    status: 409,
    description: 'Phòng đã có booking khác còn hiệu lực trùng khoảng ngày này',
  })
  create(
    @GetUser('id') userId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(createBookingDto, userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Xem lịch sử đặt phòng của chính mình' })
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
    description: 'Trả về danh sách booking của chính mình (đã phân trang)',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  findHistory(
    @GetUser('id') userId: string,
    @Query() query: BookingHistoryQueryDto,
  ) {
    return this.bookingsService.findHistory(userId, query.page, query.limit);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết 1 booking của chính mình',
    description:
      'Booking không thuộc về user hiện tại sẽ trả 404 (không phải 403 — tránh lộ thông tin tồn tại của booking người khác).',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID booking',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Trả về thông tin booking' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  findOne(@Param() params: EntityIdParamDto, @GetUser('id') userId: string) {
    return this.bookingsService.findOne(params.id, userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Huỷ yêu cầu đặt phòng (chỉ khi đang PENDING)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID booking',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Huỷ thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({
    status: 409,
    description: 'Booking không ở trạng thái PENDING nên không thể huỷ',
  })
  cancelBooking(
    @GetUser('id') userId: string,
    @Param() params: EntityIdParamDto,
    @Body() reason: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(params.id, userId, reason);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Sửa ngày/ghi chú của yêu cầu đặt phòng (chỉ khi đang PENDING)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID booking',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({
    status: 400,
    description:
      'Payload rỗng (không có field nào để cập nhật), ngày không hợp lệ (sai định dạng YYYY-MM-DD, checkIn ở quá khứ, checkOut <= checkIn), hoặc phòng không còn ACTIVE',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({
    status: 409,
    description:
      'Booking không ở trạng thái PENDING, hold giữ chỗ đã hết hạn, hoặc ngày mới trùng với 1 booking khác còn hiệu lực',
  })
  update(
    @GetUser('id') userId: string,
    @Param() params: EntityIdParamDto,
    @Body() updateDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(params.id, userId, updateDto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post(':id/pay')
  @ApiOperation({
    summary: 'Thanh toán yêu cầu đặt phòng',
    description:
      'Mock: thanh toán luôn thành công ngay lập tức. amount lấy từ booking.totalPrice ở server (không nhận từ body). Thanh toán thành công sẽ tự chuyển booking sang ACCEPTED và xoá hold.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID booking',
    example: '1',
  })
  @ApiResponse({ status: 201, description: 'Thanh toán thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({
    status: 409,
    description:
      'Booking không ở trạng thái PENDING (đã accepted/rejected/cancelled/expired), hoặc hold giữ chỗ đã hết hạn, nên không thể thanh toán',
  })
  pay(
    @GetUser('id') userId: string,
    @Param() params: EntityIdParamDto,
    @Body() dto: PayBookingDto,
  ) {
    return this.bookingsService.pay(params.id, userId, dto);
  }
}
