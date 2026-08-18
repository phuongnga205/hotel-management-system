import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking} from './entities/booking.entity';
import { Repository } from 'typeorm/repository/Repository.js';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { BookingResponseDto } from './dto/booking-response.dto';
import { Room } from '../rooms/entities/room.entity';
import { BookingStatus } from './enums/booking-status.enum';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Room) private readonly roomsRepository: Repository<Room>
  ) { }
  async create(createBookingDto: CreateBookingDto) {
    const bookingroom = await this.roomsRepository.findOne({
      where: {
        id: createBookingDto.roomId
      }
    });
    if (!bookingroom) {
      throw new NotFoundException();
    }
    const checkIn = new Date(`${createBookingDto.checkInDate}T00:00:00Z`);
    const checkOut = new Date(`${createBookingDto.checkOutDate}T00:00:00Z`);

    const nights =
      (checkOut.getTime() - checkIn.getTime()) /
      (1000 * 60 * 60 * 24);
    const totalAmount= (nights * Number(bookingroom.pricePerNight)).toFixed(2);

    const booking = await this.bookingsRepository.save({ userId: 1,totalAmount, ...createBookingDto });
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
    void updateBookingDto;
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
