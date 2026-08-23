import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { I18nService } from 'nestjs-i18n';
import { Brackets, DataSource, QueryFailedError, Repository } from 'typeorm';
import { PostgresErrorCode } from '../common/enums/postgres-error-code.enum';
import { Room } from '../rooms/entities/room.entity';
import { RoomStatus } from '../rooms/enums/room-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { AdminBookingQueryDto } from './dto/admin-booking-query.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PayBookingDto } from './dto/pay-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';
import {
  BOOKING_HOLD_MINUTES,
  MINUTE_IN_MS,
  MS_PER_DAY,
} from './constants/booking.constants';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Room) private readonly roomsRepository: Repository<Room>,
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService,
  ) {}

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
      holdExpiresAt: this.buildHoldExpiry(),
    });
    return {
      statusCode: 201,
      message: this.i18n.t('messages.BOOKING.CREATE_SUCCESS'),
      data: new BookingResponseDto(booking, { room }),
    };
  }

  async findOne(id: string, userId: string) {
    const booking = await this.bookingDetailQuery()
      .andWhere('booking.user_id = :userId', { userId })
      .andWhere('booking.id = :id', { id })
      .getOne();

    if (!booking) {
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }
    return {
      statusCode: 200,
      message: this.i18n.t('messages.BOOKING.FIND_ONE_SUCCESS'),
      data: new BookingResponseDto(booking),
    };
  }

  async findHistory(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [bookings, total] = await this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .where('booking.user_id = :userId', { userId })
      .orderBy('booking.created_at', 'DESC')
      .offset(offset)
      .limit(limit)
      .getManyAndCount();

    const latestPayments = await this.fetchLatestPayments(
      bookings.map((booking) => booking.id),
    );

    return {
      statusCode: 200,
      message: this.i18n.t('messages.BOOKING.FIND_ALL_SUCCESS'),
      data: {
        items: bookings.map(
          (booking) =>
            new BookingResponseDto(booking, {
              payment: latestPayments.get(booking.id) ?? null,
            }),
        ),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Bọc transaction + khoá pessimistic (SELECT ... FOR UPDATE) dù chỉ có 1
  // thao tác ghi để chống race condition giữa 2 request cùng sửa 1 booking
  // (VD: user update() và admin accept() cùng lúc, hoặc admin reject() và
  // user pay() cùng lúc) — nếu chỉ đọc status bằng findOne() thường rồi mới
  // save(), 2 request đọc cùng lúc đều thấy PENDING rồi cùng ghi đè nhau mà
  // không ai báo lỗi. Với FOR UPDATE, request thứ 2 phải đợi request thứ
  // nhất commit xong mới đọc được row (thấy status đã đổi) → tự nhiên rơi
  // vào nhánh throw có sẵn, không cần thêm logic mới.
  async update(id: string, userId: string, updateDto: UpdateBookingDto) {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(Booking);
      const booking = await bookingRepository.findOne({
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
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

      await this.saveBooking(booking, bookingRepository);

      return {
        statusCode: 200,
        message: this.i18n.t('messages.BOOKING.UPDATED_SUCCESS'),
      };
    });
  }

  async cancel(id: string, userId: string, reason: CancelBookingDto) {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(Booking);
      const booking = await bookingRepository.findOne({
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException(
          this.i18n.t('messages.BOOKING.CANNOT_CANCEL'),
        );
      }

      booking.status = BookingStatus.CANCELLED;
      booking.cancelReason = reason.cancelReason;

      await bookingRepository.save(booking);

      return {
        statusCode: 200,
        message: this.i18n.t('messages.BOOKING.CANCEL_SUCCESS'),
      };
    });
  }

  // Thanh toán + xác nhận booking trong cùng 1 transaction (2 thao tác ghi:
  // insert Payment + update Booking.status) — bắt buộc theo Luật 4. Amount
  // luôn lấy từ booking.totalPrice, không nhận từ FE (Luật 5). Mock: thanh
  // toán luôn thành công ngay lập tức, nhưng luồng dữ liệu (Payment thật,
  // transaction thật) đã sẵn sàng để nối cổng thanh toán thật sau này.
  async pay(id: string, userId: string, dto: PayBookingDto) {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(Booking);
      const booking = await bookingRepository.findOne({
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
      }
      if (booking.status !== BookingStatus.PENDING) {
        throw new ConflictException(this.i18n.t('messages.BOOKING.CANNOT_PAY'));
      }

      const paymentRepository = manager.getRepository(Payment);
      await paymentRepository.save(
        paymentRepository.create({
          bookingId: booking.id,
          amount: String(booking.totalPrice),
          method: dto.method,
          status: PaymentStatus.SUCCESS,
          transactionId: randomUUID(),
          paidAt: new Date(),
        }),
      );

      booking.status = BookingStatus.ACCEPTED;
      booking.holdExpiresAt = null;
      await bookingRepository.save(booking);

      return {
        statusCode: 201,
        message: this.i18n.t('messages.BOOKING.PAY_SUCCESS'),
      };
    });
  }

  // ---------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------

  async findAllForAdmin(query: AdminBookingQueryDto) {
    const { page, limit, status, search } = query;
    const offset = (page - 1) * limit;

    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.user', 'user')
      .orderBy('booking.created_at', 'DESC')
      .offset(offset)
      .limit(limit);

    if (status) {
      qb.andWhere('booking.status = :status', { status });
    }
    if (search) {
      qb.andWhere(
        new Brackets((qbSearch) => {
          qbSearch
            .where('user.full_name ILIKE :search', { search: `%${search}%` })
            .orWhere('user.email ILIKE :search', { search: `%${search}%` })
            .orWhere('CAST(booking.id AS TEXT) = :exactId', {
              exactId: search,
            });
        }),
      );
    }

    const [bookings, total] = await qb.getManyAndCount();
    const latestPayments = await this.fetchLatestPayments(
      bookings.map((booking) => booking.id),
    );

    return {
      statusCode: 200,
      message: this.i18n.t('messages.BOOKING.FIND_ALL_SUCCESS'),
      data: {
        items: bookings.map(
          (booking) =>
            new BookingResponseDto(booking, {
              payment: latestPayments.get(booking.id) ?? null,
            }),
        ),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneForAdmin(id: string) {
    const booking = await this.bookingDetailQuery()
      .leftJoinAndSelect('booking.user', 'user')
      .andWhere('booking.id = :id', { id })
      .getOne();

    if (!booking) {
      throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
    }
    return {
      statusCode: 200,
      message: this.i18n.t('messages.BOOKING.FIND_ONE_SUCCESS'),
      data: new BookingResponseDto(booking),
    };
  }

  async accept(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(Booking);
      const booking = await bookingRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking) {
        throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
      }
      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException(
          this.i18n.t('messages.BOOKING.CANNOT_ACCEPT'),
        );
      }

      booking.status = BookingStatus.ACCEPTED;
      booking.holdExpiresAt = null;
      await bookingRepository.save(booking);

      return {
        statusCode: 200,
        message: this.i18n.t('messages.BOOKING.ACCEPT_SUCCESS'),
      };
    });
  }

  async reject(id: string, dto: RejectBookingDto) {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(Booking);
      const booking = await bookingRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking) {
        throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
      }
      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException(
          this.i18n.t('messages.BOOKING.CANNOT_REJECT'),
        );
      }

      booking.status = BookingStatus.REJECTED;
      booking.cancelReason = dto.cancelReason;
      await bookingRepository.save(booking);

      return {
        statusCode: 200,
        message: this.i18n.t('messages.BOOKING.REJECT_SUCCESS'),
      };
    });
  }

  // Chạy mỗi phút để nhả các booking PENDING đã hết hạn giữ chỗ (xem
  // BOOKING_HOLD_MINUTES) — cùng với nhánh hold trong
  // assertNoOverlappingBooking(), đây là lớp thứ 2 chống race condition đặt
  // trùng phòng: app-level lọc theo hold_expires_at theo thời gian thực ngay
  // khi check overlap, còn cron này dọn lại status cho đúng thực tế (để hiện
  // thị/đồng bộ với ràng buộc EXCLUDE cấp DB, vốn chỉ lọc theo status).
  // update() trực tiếp bằng QueryBuilder, không load rồi save từng dòng
  // (tránh N+1 — Luật 4).
  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleHolds(): Promise<void> {
    await this.bookingsRepository
      .createQueryBuilder()
      .update(Booking)
      .set({ status: BookingStatus.EXPIRED, holdExpiresAt: null })
      .where('status = :status', { status: BookingStatus.PENDING })
      .andWhere('hold_expires_at IS NOT NULL')
      .andWhere('hold_expires_at < NOW()')
      .execute();
  }

  private bookingDetailQuery() {
    return this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('room.images', 'roomImage')
      .leftJoinAndSelect('booking.payments', 'payment');
  }

  // Lấy payment mới nhất của mỗi booking bằng 1 query gộp duy nhất (không
  // join trực tiếp `booking.payments` ở các query danh sách có phân trang —
  // quan hệ này là OneToMany nên join sẽ nhân dòng, khiến offset/limit tính
  // sai số booking mỗi trang; xem thêm ghi chú Luật 4 trong plan) — tránh
  // N+1 vì chỉ 1 query bổ sung cho cả trang, không phải 1 query/booking.
  private async fetchLatestPayments(
    bookingIds: string[],
  ): Promise<Map<string, Payment>> {
    if (bookingIds.length === 0) return new Map();

    const payments = await this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .where('payment.booking_id IN (:...bookingIds)', { bookingIds })
      .orderBy('payment.created_at', 'DESC')
      .getMany();

    const latestByBooking = new Map<string, Payment>();
    for (const payment of payments) {
      if (!latestByBooking.has(payment.bookingId)) {
        latestByBooking.set(payment.bookingId, payment);
      }
    }
    return latestByBooking;
  }

  private buildHoldExpiry(): Date {
    return new Date(Date.now() + BOOKING_HOLD_MINUTES * MINUTE_IN_MS);
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

  // Chặn race condition đặt trùng phòng: 1 booking chỉ thực sự "giữ chỗ"
  // khi ACCEPTED, hoặc PENDING và hold_expires_at vẫn còn hiệu lực — 1 hold
  // đã hết hạn (dù cron expireStaleHolds() chưa kịp quét) sẽ không còn chặn
  // người khác đặt cùng ngày/phòng. Khi sửa ngày lúc PENDING (update()),
  // excludeBookingId loại chính booking đang sửa ra khỏi phép so trùng.
  private async assertNoOverlappingBooking(
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeBookingId?: string,
  ): Promise<void> {
    const query = this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.room_id = :roomId', { roomId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('booking.status = :acceptedStatus', {
            acceptedStatus: BookingStatus.ACCEPTED,
          }).orWhere(
            new Brackets((qbHold) => {
              qbHold
                .where('booking.status = :pendingStatus', {
                  pendingStatus: BookingStatus.PENDING,
                })
                .andWhere('booking.hold_expires_at > NOW()');
            }),
          );
        }),
      )
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
    const nights = (checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY;
    return nights * Number(pricePerNight);
  }

  private async saveBooking(
    booking: Partial<Booking> | Booking,
    repository: Repository<Booking> = this.bookingsRepository,
  ): Promise<Booking> {
    try {
      return await repository.save(booking);
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
