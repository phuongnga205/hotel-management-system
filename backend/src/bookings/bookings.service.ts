import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Decimal } from 'decimal.js';
import { I18nService } from 'nestjs-i18n';
import {
  Brackets,
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
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
import {
  DEFAULT_HOTEL_TIMEZONE,
  ENVIRONMENT_KEYS,
} from '../config/environment.constants';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Room) private readonly roomsRepository: Repository<Room>,
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
  ) {}

  // create() chạy hoàn toàn trong 1 transaction: expire hold cũ → check
  // phòng còn ACTIVE → check overlap → insert, tất cả cùng 1 EntityManager.
  // Trước đây các bước này chạy bằng repository global (ngoài transaction),
  // nên 2 request tạo booking cùng phòng/cùng ngày có thể cùng đọc "chưa
  // overlap" trước khi request nào insert xong — EXCLUDE constraint ở DB là
  // lưới chặn cuối cùng, nhưng phải nằm trong transaction thì effort đó mới
  // có tác dụng phối hợp với các bước check phía trên.
  async create(createBookingDto: CreateBookingDto, userId: string) {
    this.assertValidDateRange(
      createBookingDto.checkInDate,
      createBookingDto.checkOutDate,
    );

    return this.dataSource.transaction(async (manager) => {
      await this.expireStaleHoldsForRoom(manager, createBookingDto.roomId);

      const room = await this.findBookableRoom(
        manager,
        createBookingDto.roomId,
        createBookingDto.guests,
      );
      await this.assertNoOverlappingBooking(
        manager,
        createBookingDto.roomId,
        createBookingDto.checkInDate,
        createBookingDto.checkOutDate,
      );
      const totalPrice = this.calculateTotalPrice(
        createBookingDto.checkInDate,
        createBookingDto.checkOutDate,
        room.pricePerNight,
        createBookingDto.guests,
      );

      const booking = await this.saveBooking(manager.getRepository(Booking), {
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
    });
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
    if (
      updateDto.checkInDate === undefined &&
      updateDto.checkOutDate === undefined &&
      updateDto.note === undefined
    ) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.NO_FIELDS_TO_UPDATE'),
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(Booking);
      const booking = await bookingRepository.findOne({
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        throw new NotFoundException(this.i18n.t('messages.BOOKING.NOT_FOUND'));
      }

      await this.assertHoldStillActive(manager, booking);
      if (booking.status !== BookingStatus.PENDING) {
        throw new ConflictException(
          this.i18n.t('messages.BOOKING.CANNOT_UPDATE'),
        );
      }

      const checkInDate = updateDto.checkInDate ?? booking.checkInDate;
      const checkOutDate = updateDto.checkOutDate ?? booking.checkOutDate;

      this.assertValidDateRange(checkInDate, checkOutDate);

      // Cùng lý do với create(): expire hold cũ của phòng này ngay trong
      // transaction trước khi check overlap, để không bị DB từ chối bằng
      // exclusion_violation vì 1 PENDING khác đã hết hold nhưng cron chưa
      // kịp quét (xem expireStaleHoldsForRoom()).
      await this.expireStaleHoldsForRoom(manager, booking.roomId);

      // guests KHONG duoc sua qua update() (chot voi user) - luon dung lai
      // gia tri da luu tu luc tao, chi truyen lai de validate capacity +
      // tinh gia theo dung phong (co the doi neu sau nay cho doi phong).
      const room = await this.findBookableRoom(
        manager,
        booking.roomId,
        booking.guests,
      );
      await this.assertNoOverlappingBooking(
        manager,
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
        booking.guests,
      );

      await this.saveBooking(bookingRepository, booking);

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
        throw new ConflictException(
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
  //
  // Cho phép trả CẢ 2 trường hợp (khác điều kiện cũ chỉ nhận PENDING):
  //  - PENDING + hold còn hạn: luồng gốc — thanh toán để tự chuyển ACCEPTED.
  //  - ACCEPTED mà CHƯA có Payment SUCCESS nào: "trả bù" cho booking đã được
  //    Admin duyệt thẳng (accept()) mà không qua thanh toán online — không
  //    giới hạn thời gian (ACCEPTED không có hold), khớp đúng điều kiện
  //    `canPay` FE đã cài sẵn ở BookingCard.tsx từ trước. Không đổi lại
  //    booking.status (đã đúng ACCEPTED), chỉ thêm dòng Payment.
  // Mọi trạng thái khác (REJECTED/CANCELLED/EXPIRED, hoặc ACCEPTED đã có
  // Payment SUCCESS rồi) đều bị chặn — không cho trả tiền cho booking đã
  // "chết" hoặc trả trùng lần 2.
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
      // No-op trừ khi đang PENDING và hold đã hết hạn — tự expire rồi throw,
      // không ảnh hưởng nhánh ACCEPTED bên dưới.
      await this.assertHoldStillActive(manager, booking);

      const paymentRepository = manager.getRepository(Payment);

      if (booking.status === BookingStatus.ACCEPTED) {
        const alreadyPaid = await paymentRepository.exists({
          where: { bookingId: booking.id, status: PaymentStatus.SUCCESS },
        });
        if (alreadyPaid) {
          throw new ConflictException(
            this.i18n.t('messages.BOOKING.ALREADY_PAID'),
          );
        }
      } else if (booking.status !== BookingStatus.PENDING) {
        throw new ConflictException(this.i18n.t('messages.BOOKING.CANNOT_PAY'));
      }

      await paymentRepository.save(
        paymentRepository.create({
          bookingId: booking.id,
          amount: booking.totalPrice.toString(),
          method: dto.method,
          status: PaymentStatus.SUCCESS,
          transactionId: randomUUID(),
          paidAt: new Date(),
        }),
      );

      if (booking.status === BookingStatus.PENDING) {
        booking.status = BookingStatus.ACCEPTED;
        booking.holdExpiresAt = null;
        await bookingRepository.save(booking);
      }

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
      await this.assertHoldStillActive(manager, booking);
      if (booking.status !== BookingStatus.PENDING) {
        throw new ConflictException(
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
      await this.assertHoldStillActive(manager, booking);
      if (booking.status !== BookingStatus.PENDING) {
        throw new ConflictException(
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
  // BOOKING_HOLD_MINUTES) trên toàn hệ thống — lớp dọn dẹp nền, không phải
  // lớp chống race condition chính: mỗi transaction ghi (create/update/pay/
  // accept/reject) đã tự expire/kiểm tra hold của riêng nó ngay lúc chạy
  // (expireStaleHoldsForRoom/assertHoldStillActive), nên booking hết hold
  // không bao giờ phải đợi tới lượt quét mỗi phút này mới hết hiệu lực.
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

  // Lấy payment mới nhất của mỗi booking bằng DISTINCT ON (Postgres) — DB
  // trả thẳng đúng 1 dòng/booking đã được chọn theo created_at DESC, không
  // còn phải tải toàn bộ lịch sử payment về rồi lọc bằng JS (trước đây có
  // thể tải hàng nghìn dòng payment cũ chỉ để lấy dòng mới nhất mỗi
  // booking). Vẫn chỉ 1 query bổ sung cho cả trang — tránh N+1.
  private async fetchLatestPayments(
    bookingIds: string[],
  ): Promise<Map<string, Payment>> {
    if (bookingIds.length === 0) return new Map();

    const payments = await this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .distinctOn(['payment.booking_id'])
      .where('payment.booking_id IN (:...bookingIds)', { bookingIds })
      .orderBy('payment.booking_id', 'ASC')
      .addOrderBy('payment.created_at', 'DESC')
      .getMany();

    const latestByBooking = new Map<string, Payment>();
    for (const payment of payments) {
      latestByBooking.set(payment.bookingId, payment);
    }
    return latestByBooking;
  }

  private buildHoldExpiry(): Date {
    return new Date(Date.now() + BOOKING_HOLD_MINUTES * MINUTE_IN_MS);
  }

  private todayInHotelTimezone(): string {
    const timeZone =
      this.configService.get<string>(ENVIRONMENT_KEYS.HOTEL_TIMEZONE) ||
      DEFAULT_HOTEL_TIMEZONE;
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }

  private assertValidDateRange(checkInDate: string, checkOutDate: string) {
    if (checkInDate < this.todayInHotelTimezone()) {
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

  // Booking đang giữ (PENDING) mà hold_expires_at đã trôi qua thì không còn
  // quyền gì nữa dù cron dọn nền (expireStaleHolds()) chưa kịp quét tới —
  // hàm này tự expire ngay booking đang lock (đã SELECT ... FOR UPDATE ở
  // caller) rồi throw, để update()/pay()/accept()/reject() không thể thao
  // tác trên 1 hold đã hết hạn, đồng thời nhả chỗ ngay lập tức cho EXCLUDE
  // constraint (status đổi khỏi PENDING) thay vì chờ cron.
  private async assertHoldStillActive(
    manager: EntityManager,
    booking: Booking,
  ): Promise<void> {
    if (
      booking.status === BookingStatus.PENDING &&
      booking.holdExpiresAt &&
      booking.holdExpiresAt.getTime() <= Date.now()
    ) {
      await manager.getRepository(Booking).update(booking.id, {
        status: BookingStatus.EXPIRED,
        holdExpiresAt: null,
      });
      booking.status = BookingStatus.EXPIRED;
      booking.holdExpiresAt = null;
      throw new ConflictException(this.i18n.t('messages.BOOKING.HOLD_EXPIRED'));
    }
  }

  // Chạy trong cùng transaction, trước khi check overlap / insert / update
  // — đồng bộ app-level với EXCLUDE constraint ở DB (chỉ biết status, không
  // biết "hold" là gì). Không có bước này, assertNoOverlappingBooking() có
  // thể coi 1 PENDING đã hết hold là "trống" và cho phép tiếp tục, nhưng
  // insert/update vẫn bị DB từ chối bằng exclusion_violation vì hàng đó vẫn
  // đang PENDING trong CSDL — user bị báo trùng lịch tới khi cron
  // expireStaleHolds() (mỗi phút) quét dọn
  private async expireStaleHoldsForRoom(
    manager: EntityManager,
    roomId: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(Booking)
      .set({ status: BookingStatus.EXPIRED, holdExpiresAt: null })
      .where('room_id = :roomId', { roomId })
      .andWhere('status = :status', { status: BookingStatus.PENDING })
      .andWhere('hold_expires_at IS NOT NULL')
      .andWhere('hold_expires_at < NOW()')
      .execute();
  }

  // Chặn race condition đặt trùng phòng: 1 booking chỉ thực sự "giữ chỗ"
  // khi ACCEPTED, hoặc PENDING và hold_expires_at vẫn còn hiệu lực — 1 hold
  // đã hết hạn (dù cron expireStaleHolds() chưa kịp quét) sẽ không còn chặn
  // người khác đặt cùng ngày/phòng. Khi sửa ngày lúc PENDING (update()),
  // excludeBookingId loại chính booking đang sửa ra khỏi phép so trùng.
  // Luôn nhận `manager` của transaction hiện tại (không dùng repository
  // global) để nằm cùng transaction với insert/update phía sau.
  private async assertNoOverlappingBooking(
    manager: EntityManager,
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeBookingId?: string,
  ): Promise<void> {
    const query = manager
      .getRepository(Booking)
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

  private async findBookableRoom(
    manager: EntityManager,
    roomId: string,
    guests: number,
  ): Promise<Room> {
    const room = await manager
      .getRepository(Room)
      .findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(this.i18n.t('messages.ROOM_NOT_FOUND'));
    }
    if (room.status !== RoomStatus.ACTIVE) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.ROOM_UNAVAILABLE'),
      );
    }
    if (guests > room.capacity) {
      throw new BadRequestException(
        this.i18n.t('messages.BOOKING.GUESTS_EXCEED_CAPACITY'),
      );
    }
    return room;
  }

  private calculateTotalPrice(
    checkInDate: string,
    checkOutDate: string,
    pricePerNight: Decimal,
    guests: number,
  ): Decimal {
    const checkIn = new Date(`${checkInDate}T00:00:00Z`);
    const checkOut = new Date(`${checkOutDate}T00:00:00Z`);
    const nights = (checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY;
    return pricePerNight.times(nights).times(guests);
  }

  private async saveBooking(
    repository: Repository<Booking>,
    booking: Partial<Booking> | Booking,
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
