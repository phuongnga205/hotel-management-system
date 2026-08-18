import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Repository } from 'typeorm/repository/Repository.js';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { BookingResponseDto } from './dto/booking-response.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookingsRepository: Repository<Booking>
  ) { }
  async create(createBookingDto: CreateBookingDto) {
    const booking = await this.bookingsRepository.save(createBookingDto);
    if (!booking) {
      throw new Error('Booking request failed');
    }
    return new BookingResponseDto(booking);
  }

  findAll() {
    return `This action returns all bookings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  async remove(id: number, reason: string) {
    const result = await this.bookingsRepository.update(
      id,
      { note: reason, status: BookingStatus.CANCELLED }
    );
    if (result.affected === 0) {
      throw new NotFoundException();
    }
    return {
      message: "Booking request deleted",
    }
  }
}
