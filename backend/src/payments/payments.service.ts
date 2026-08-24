import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Payment } from './entities/payment.entity';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import { AdminPaymentResponseDto } from './dto/admin-payment-response.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly i18n: I18nService,
  ) {}

  // GET /admin/payments — bảng giao dịch dùng ở màn Statistics > Revenue.
  // Join booking -> user/room bằng QueryBuilder (không dùng .find() không
  // phân trang — Luật 4) để hiện tên khách/phòng ngay trong bảng mà không
  // phải gọi thêm request nào khác.
  async findAllForAdmin(query: AdminPaymentQueryDto) {
    const { page, limit, status, method } = query;
    const offset = (page - 1) * limit;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.room', 'room')
      .orderBy('payment.created_at', 'DESC')
      .offset(offset)
      .limit(limit);

    if (status) {
      qb.andWhere('payment.status = :status', { status });
    }
    if (method) {
      qb.andWhere('payment.method = :method', { method });
    }

    const [payments, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.PAYMENT.FIND_ALL_SUCCESS'),
      data: {
        items: payments.map((payment) => new AdminPaymentResponseDto(payment)),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForUser(userId: string, query: PaymentQueryDto) {
    const { page, limit, status, method } = query;
    const offset = (page - 1) * limit;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndSelect('booking.room', 'room')
      .where('booking.user_id = :userId', { userId })
      .orderBy('payment.created_at', 'DESC')
      .offset(offset)
      .limit(limit);

    if (status) {
      qb.andWhere('payment.status = :status', { status });
    }
    if (method) {
      qb.andWhere('payment.method = :method', { method });
    }

    const [payments, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.PAYMENT.FIND_ALL_SUCCESS'),
      data: {
        items: payments.map((payment) => new PaymentResponseDto(payment)),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
