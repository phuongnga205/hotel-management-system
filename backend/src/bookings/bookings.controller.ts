import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Huỷ yêu cầu đặt phòng (kèm lý do)',
    description:
      'Chỉ chủ booking mới huỷ được (userId lấy từ JWT, không nhận từ body). Chỉ huỷ được khi booking đang PENDING hoặc ACCEPTED. Huỷ thành công sẽ gửi email báo trạng thái (event BookingStatusChanged).',
  })
  @ApiResponse({ status: 200, description: 'Huỷ thành công' })
  @ApiResponse({ status: 403, description: 'Không phải chủ booking' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({
    status: 409,
    description: 'Booking đang ở trạng thái không thể huỷ',
  })
  cancel(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() cancelBookingDto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, userId, cancelBookingDto);
  }

  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingsService.remove(id);
  }
}
