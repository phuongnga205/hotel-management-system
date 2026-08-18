import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { Repository } from 'typeorm/repository/Repository.js';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { Room } from '../rooms/entities/room.entity';
import { AppEvent } from '../common/events/event-names.constants';
import { BookingStatusChangedEvent } from '../common/events/booking-status-changed.event';

// Các trạng thái mà user còn được phép tự huỷ — 1 booking đã REJECTED/
// CANCELLED/EXPIRED thì không còn gì để huỷ nữa.
const CANCELLABLE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.ACCEPTED,
];

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Room) private readonly roomsRepository: Repository<Room>,
    private readonly i18n: I18nService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  create(createBookingDto: CreateBookingDto) {
    void createBookingDto;
    return 'created';
    /*const bookingroom = await this.roomsRepository.findOne({
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
    return new BookingResponseDto(booking);*/
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

  remove(id: string) {
    void id;
    /*const result = await this.bookingsRepository.update(
      id,
      { note: reason, status: BookingStatus.CANCELLED }
    );
    if (result.affected === 0) {
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }*/
    return {
      message: this.i18n.t('messages.BOOKING.DELETED_SUCCESS'),
    };
  }

  // userId luôn lấy từ JWT (@GetUser trong controller), không tin userId
  // đến từ body/param để xác định quyền sở hữu booking.
  async cancel(id: string, userId: string, dto: CancelBookingDto) {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!booking) {
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException(
        this.i18n.t('messages.BOOKING.CANCEL_FORBIDDEN'),
      );
    }
    if (!CANCELLABLE_STATUSES.includes(booking.status)) {
      throw new ConflictException(
        this.i18n.t('messages.BOOKING.CANCEL_INVALID_STATUS'),
      );
    }

    const oldStatus = booking.status;
    booking.status = BookingStatus.CANCELLED;
    booking.cancelReason = dto.reason;
    await this.bookingsRepository.save(booking);

    if (booking.user) {
      this.eventEmitter.emit(
        AppEvent.BOOKING_STATUS_CHANGED,
        new BookingStatusChangedEvent(
          booking.id,
          booking.user.id,
          booking.user.email,
          booking.user.username,
          oldStatus,
          booking.status,
        ),
      );
    }

    return {
      message: this.i18n.t('messages.BOOKING.CANCEL_SUCCESS'),
    };
  }
}
