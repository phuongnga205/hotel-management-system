/* sunlint-disable S037 */
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
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingHistoryQueryDto } from './dto/booking-history-query.dto';

// STUB: các route chỉ delegate sang BookingsService (đang là stub) — giữ
// nguyên phần khai báo route/guard để FE không đổi contract, chờ triển
// khai lại logic ở PR riêng cho booking.
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @GetUser('id') userId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(createBookingDto, userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  findHistory(
    @GetUser('id') userId: string,
    @Query() query: BookingHistoryQueryDto,
  ) {
    return this.bookingsService.findHistory(userId, query.page, query.limit);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.bookingsService.findOne(id, userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelBooking(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() reason: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, userId, reason);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, userId, updateDto);
  }
}
