import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { Repository } from 'typeorm/repository/Repository.js';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { Room } from '../rooms/entities/room.entity';
import { BookingResponseDto } from './dto/booking-response.dto';
import { BookingStatus } from './enums/booking-status.enum';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Room) private readonly roomsRepository: Repository<Room>,
    private readonly i18n: I18nService,
  ) { }
  async create(createBookingDto: CreateBookingDto, userId: string) {
    const bookingroom = await this.roomsRepository.findOne({
      where: {
        id: createBookingDto.roomId
      }
    });
    if (!bookingroom) {
      throw new NotFoundException(this.i18n.t('messages.ROOM_NOT_FOUND'));
    }
    const checkIn = new Date(`${createBookingDto.checkInDate}T00:00:00Z`);
    const checkOut = new Date(`${createBookingDto.checkOutDate}T00:00:00Z`);

    const nights =
      (checkOut.getTime() - checkIn.getTime()) /
      (1000 * 60 * 60 * 24);
    const totalAmount = (nights * Number(bookingroom.pricePerNight));

    const booking = await this.bookingsRepository.save({
      userId: userId,
      totalPrice: totalAmount,
      ...createBookingDto,
      pricePerNight: bookingroom.pricePerNight,
    });
    if (!booking) {
      throw new Error(this.i18n.t("messages.BOOK.REQUEST_FAIL"));
    }
    return new BookingResponseDto(booking);
    //trên server đã có constraint excl_bookings_no_overlap để tránh lặp rồi nên không cần logic xét ngày trùng nữa
  }

  findAll() {
    return `This action returns all bookings`;
  }

  findOne(id: string) {
    return `This action returns a #${id} booking`;
  }

  update(id: string, updateBookingDto: UpdateBookingDto) {
    void updateBookingDto;
    return `This action updates a #${id} booking`;
  }

  async cancel(id: string, userId: string, reason: CancelBookingDto) {
    const booking = await this.bookingsRepository.findOne({
      where: {
        id: id,
        userId,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        this.i18n.t('messages.BOOKING.NOT_FOUND'),
      );
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.CANNOT_CANCEL'),
      );
    }
    const result = await this.bookingsRepository.update(
      id,
      {
        cancelReason: reason.cancelReason,
        status: BookingStatus.CANCELLED
      }
    );
    if (result.affected === 0) {
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }
    return {
      message: this.i18n.t('messages.BOOKING.CANCEL_SUCCESS'),
    };
  }
}
