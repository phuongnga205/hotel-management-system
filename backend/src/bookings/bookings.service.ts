import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, Repository } from 'typeorm';
import { PostgresErrorCode } from '../common/enums/postgres-error-code.enum';
import { Room } from '../rooms/entities/room.entity';
import { RoomStatus } from '../rooms/enums/room-status.enum';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Room) private readonly roomsRepository: Repository<Room>,
    private readonly i18n: I18nService,
  ) { }

  async create(createBookingDto: CreateBookingDto, userId: string) {
    this.assertValidDateRange(
      createBookingDto.checkInDate,
      createBookingDto.checkOutDate,
    );
    const room = await this.findBookableRoom(createBookingDto.roomId);
    await this.assertNoOverlappingBooking(
      createBookingDto.roomId,
      createBookingDto.checkInDate,
      createBookingDto.checkOutDate,
    );
    const totalPrice = this.calculateTotalPrice(
      createBookingDto.checkInDate,
      createBookingDto.checkOutDate,
      room.pricePerNight,
    );

    const booking = await this.saveBooking({
      userId,
      totalPrice,
      ...createBookingDto,
      pricePerNight: room.pricePerNight,
    });
    return new BookingResponseDto(booking);
  }

  async findOne(id: string, userId: string) {
    const booking = await this.bookingsRepository.findOne({
      where: {
        id: id,
        userId: userId,
      },
    });
    if (!booking) {
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }
    return new BookingResponseDto(booking);
  }

  async findHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [bookings, total] = await this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.user_id = :userId', { userId })
      .orderBy('booking.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: bookings.map((booking) => new BookingResponseDto(booking)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, userId: string, updateDto: UpdateBookingDto) {
    const booking = await this.bookingsRepository.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!booking) {
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.CANNOT_UPDATE'),
      );
    }

    const checkInDate = updateDto.checkInDate ?? booking.checkInDate;
    const checkOutDate = updateDto.checkOutDate ?? booking.checkOutDate;

    this.assertValidDateRange(checkInDate, checkOutDate);

    const room = await this.findBookableRoom(booking.roomId);
    await this.assertNoOverlappingBooking(
      booking.roomId,
      checkInDate,
      checkOutDate,
      booking.id,
    );

    booking.checkInDate = checkInDate;
    booking.checkOutDate = checkOutDate;
    if (updateDto.note !== undefined) {
      booking.note = updateDto.note;
    }

    booking.pricePerNight = room.pricePerNight;
    booking.totalPrice = this.calculateTotalPrice(
      checkInDate,
      checkOutDate,
      room.pricePerNight,
    );

    await this.saveBooking(booking);

    return {
      message: this.i18n.t('messages.BOOKING.UPDATED_SUCCESS'),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cancel(
    id: string,
    userId: string,
    reason: CancelBookingDto,
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
        this.i18n.t('messages.BOOKING.CANNOT_CANCEL'),
      );
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelReason = reason.cancelReason;

    await this.bookingsRepository.save(booking);

    return {
      message: this.i18n.t('messages.BOOKING.CANCEL_SUCCESS'),
    };
  }

  private todayInHoChiMinh(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());
  }

  private assertValidDateRange(checkInDate: string, checkOutDate: string) {
    if (checkInDate < this.todayInHoChiMinh()) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.CHECK_IN_DATE_IN_PAST'),
      );
    }

    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.INVALID_DATE_RANGE'),
      );
    }
  }

  private async assertNoOverlappingBooking(
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeBookingId?: string,
  ): Promise<void> {
    const query = this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.room_id = :roomId', { roomId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.ACCEPTED],
      })
      .andWhere('booking.check_in_date < :checkOutDate', { checkOutDate })
      .andWhere('booking.check_out_date > :checkInDate', { checkInDate });

    if (excludeBookingId) {
      query.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    const overlapping = await query.getOne();
    if (overlapping) {
      throw new ConflictException(
        this.i18n.t('messages.BOOKING.DATES_OVERLAP'),
      );
    }
  }

  private async findBookableRoom(roomId: string): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
    });
    if (!room) {
      throw new NotFoundException(this.i18n.t('messages.ROOM_NOT_FOUND'));
    }
    if (room.status !== RoomStatus.ACTIVE) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.ROOM_UNAVAILABLE'),
      );
    }
    return room;
  }

  private calculateTotalPrice(
    checkInDate: string,
    checkOutDate: string,
    pricePerNight: number,
  ): number {
    const checkIn = new Date(`${checkInDate}T00:00:00Z`);
    const checkOut = new Date(`${checkOutDate}T00:00:00Z`);
    const nights =
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);
    return nights * Number(pricePerNight);
  }

  private async saveBooking(
    booking: Partial<Booking> | Booking,
  ): Promise<Booking> {
    try {
      return await this.bookingsRepository.save(booking);
    } catch (error: unknown) {
      if (this.isExclusionViolation(error)) {
        throw new ConflictException(
          this.i18n.t('messages.BOOKING.DATES_OVERLAP'),
        );
      }
      throw error;
    }
  }

  private isExclusionViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as { code?: string };
    return driverError.code === PostgresErrorCode.EXCLUSION_VIOLATION;
  }
}
