import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingHistoryQueryDto } from './dto/booking-history-query.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) { }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() req,
    @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto, req.user.id);
  }


  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get("history")
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
    @Req() req,
    @Query() query: BookingHistoryQueryDto
  ) {
    return this.bookingsService.findHistory(req.user.id, query.page, query.limit);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req,
  ) {
    return this.bookingsService.findOne(id, req.user.id);
  }


  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelBooking(
    @Req() req,
    @Param('id') id: string,
    @Body() reason: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, req.user.id, reason);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, req.user.id, updateDto);
  }
}
