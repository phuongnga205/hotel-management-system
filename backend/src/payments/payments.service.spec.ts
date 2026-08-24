import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentStatus } from './enums/payment-status.enum';

function chainableQueryBuilder(overrides: Record<string, unknown> = {}) {
  const qb: Record<string, unknown> = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    ...overrides,
  };
  return qb;
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  const createQueryBuilder = jest.fn<
    ReturnType<typeof chainableQueryBuilder>,
    []
  >();

  const payment: Payment = {
    id: '1',
    bookingId: '10',
    booking: {
      id: '10',
      user: { id: '2', fullName: 'Jane Doe', email: 'jane@example.com' },
      room: { id: '5', name: 'Deluxe Room', roomNumber: '101' },
    } as Payment['booking'],
    amount: '1500000.00',
    method: PaymentMethod.VNPAY,
    status: PaymentStatus.SUCCESS,
    transactionId: 'txn-1',
    paidAt: new Date('2026-08-20T10:00:00Z'),
    createdAt: new Date('2026-08-20T10:00:00Z'),
    updatedAt: new Date('2026-08-20T10:00:00Z'),
    deletedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    createQueryBuilder.mockReturnValue(
      chainableQueryBuilder({
        getManyAndCount: jest.fn().mockResolvedValue([[payment], 1]),
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: { createQueryBuilder },
        },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('findAllForAdmin()', () => {
    it('trả về danh sách đã phân trang, map kèm thông tin khách/phòng', async () => {
      const result = await service.findAllForAdmin({
        page: 1,
        limit: 10,
      });

      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]).toMatchObject({
        id: '1',
        bookingId: '10',
        amount: '1500000.00',
        method: PaymentMethod.VNPAY,
        status: PaymentStatus.SUCCESS,
        booking: {
          id: '10',
          guestName: 'Jane Doe',
          guestEmail: 'jane@example.com',
          roomName: 'Deluxe Room',
          roomNumber: '101',
        },
      });
      expect(result.data.total).toBe(1);
    });

    it('áp filter status/method vào query builder khi có truyền', async () => {
      const qb = chainableQueryBuilder();
      createQueryBuilder.mockReturnValue(qb);

      await service.findAllForAdmin({
        page: 1,
        limit: 10,
        status: PaymentStatus.FAILED,
        method: PaymentMethod.CASH,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('payment.status = :status', {
        status: PaymentStatus.FAILED,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('payment.method = :method', {
        method: PaymentMethod.CASH,
      });
    });

    it('tính offset theo page/limit (không dùng skip/take)', async () => {
      const qb = chainableQueryBuilder();
      createQueryBuilder.mockReturnValue(qb);

      await service.findAllForAdmin({ page: 3, limit: 20 });

      expect(qb.offset).toHaveBeenCalledWith(40);
      expect(qb.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findAllForUser()', () => {
    it('scope theo booking.user_id, không kèm thông tin khách (chỉ booking/room)', async () => {
      const qb = chainableQueryBuilder({
        getManyAndCount: jest.fn().mockResolvedValue([[payment], 1]),
      });
      createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllForUser('2', { page: 1, limit: 10 });

      expect(qb.where).toHaveBeenCalledWith('booking.user_id = :userId', {
        userId: '2',
      });
      expect(result.data.items[0]).toMatchObject({
        id: '1',
        bookingId: '10',
        booking: {
          id: '10',
          roomName: 'Deluxe Room',
          roomNumber: '101',
        },
      });
      expect(result.data.items[0]).not.toHaveProperty('booking.guestName');
    });

    it('áp filter status/method vào query builder khi có truyền', async () => {
      const qb = chainableQueryBuilder();
      createQueryBuilder.mockReturnValue(qb);

      await service.findAllForUser('2', {
        page: 1,
        limit: 10,
        status: PaymentStatus.SUCCESS,
        method: PaymentMethod.VNPAY,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('payment.status = :status', {
        status: PaymentStatus.SUCCESS,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('payment.method = :method', {
        method: PaymentMethod.VNPAY,
      });
    });
  });
});
