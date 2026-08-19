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

  //CREATE
  async create(createBookingDto: CreateBookingDto, userId: string) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());

    if (createBookingDto.checkInDate < today) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.CHECK_IN_DATE_IN_PAST'),
      );
    }

    if (createBookingDto.checkOutDate <= createBookingDto.checkInDate) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.INVALID_DATE_RANGE'),
      );
    }
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
    return new BookingResponseDto(booking);
    //trên server đã có constraint excl_bookings_no_overlap để tránh lặp rồi nên không cần logic xét ngày trùng nữa
  }

  findAll() {
    return `This action returns all bookings`;
  }

  async findOne(id: string, userId: string) {
    const booking = await this.bookingsRepository.findOne({
      where: {
        id: id,
        userId: userId
      }
    })
    if (!booking) {
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }
    return new BookingResponseDto(booking);
  }

  async findHistory(
    userId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [bookings, total] = await this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.user_id = :userId', { userId })
      .orderBy('booking.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: bookings.map(
        booking => new BookingResponseDto(booking),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateBookingDto,
  ) {
    const booking = await this.bookingsRepository.findOne({
      where: {
        id,
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
        this.i18n.t('messages.BOOKING.CANNOT_UPDATE'),
      );
    }

    const roomId =booking.roomId;
    const checkInDate =
      updateDto.checkInDate ?? booking.checkInDate;
    const checkOutDate =
      updateDto.checkOutDate ?? booking.checkOutDate;

    // Validate date
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());

    if (checkInDate < today) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.CHECK_IN_DATE_IN_PAST'),
      );
    }

    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.INVALID_DATE_RANGE'),
      );
    }

    // Validate room
    const room = await this.roomsRepository.findOne({
      where: {
        id: roomId,
      },
    });

    if (!room) {
      throw new NotFoundException(
        this.i18n.t('messages.ROOM_NOT_FOUND'),
      );
    }

    // Update booking data
    booking.roomId = roomId;
    booking.checkInDate = checkInDate;
    booking.checkOutDate = checkOutDate;

    // Price MUST be calculated by backend
    booking.pricePerNight = room.pricePerNight;

    const checkIn = new Date(`${checkInDate}T00:00:00Z`);
    const checkOut = new Date(`${checkOutDate}T00:00:00Z`);

    const nights =
      (checkOut.getTime() - checkIn.getTime()) /
      (1000 * 60 * 60 * 24);

    booking.totalPrice =
      nights * Number(room.pricePerNight);

    await this.bookingsRepository.save(booking);

    return {
      message: this.i18n.t('messages.BOOKING.UPDATED_SUCCESS'),
    };
  }

  async cancel(id: string, userId: string, reason: CancelBookingDto) {
    const result = await this.bookingsRepository.update(
      {
        id,
        userId,
        status: BookingStatus.PENDING,
      },
      {
        status: BookingStatus.CANCELLED,
        cancelReason: reason.cancelReason,
      },
    );

    if (result.affected === 0) {
      throw new BadRequestException(this.i18n.t('messages.BOOKING.CANNOT_CANCEL'));
    }
    return {
      message: this.i18n.t('messages.BOOKING.CANCEL_SUCCESS'),
    };
  }
}
