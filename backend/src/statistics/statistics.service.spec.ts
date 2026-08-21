import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { RedisUtil } from '../token/redis.util';
import { StatisticsPeriod } from './enums/statistics-period.enum';
import { StatisticsLogger } from './statistics.logger';
import { StatisticsService } from './statistics.service';
import { I18nService } from 'nestjs-i18n';
import { ServiceUnavailableException } from '@nestjs/common';

function createQueryBuilder(rows: Array<{ label: string; value: string }>) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

describe('StatisticsService', () => {
  let service: StatisticsService;
  let bookingRepository: Pick<Repository<Booking>, 'createQueryBuilder'>;
  let paymentRepository: Pick<Repository<Payment>, 'createQueryBuilder'>;
  const redis = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    acquireLock: jest.fn(),
    extendLock: jest.fn(),
    releaseLock: jest.fn(),
  };

  beforeEach(async () => {
    bookingRepository = { createQueryBuilder: jest.fn() };
    paymentRepository = { createQueryBuilder: jest.fn() };
    redis.findOne.mockReset();
    redis.save.mockReset();
    redis.delete.mockReset();
    redis.acquireLock.mockReset().mockResolvedValue(true);
    redis.extendLock.mockReset().mockResolvedValue(true);
    redis.releaseLock.mockReset().mockResolvedValue(undefined);
    redis.save.mockResolvedValue(undefined);
    redis.delete.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: bookingRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepository,
        },
        { provide: RedisUtil, useValue: redis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
          },
        },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
        {
          provide: StatisticsLogger,
          useValue: { warn: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(StatisticsService);
  });

  it('returns a cached response without querying PostgreSQL', async () => {
    const buckets = Array.from({ length: 12 }, (_, index) => ({
      label: `2026-${String(index + 1).padStart(2, '0')}`,
      revenue: index === 0 ? '100.00' : '0.00',
      bookingCount: index === 0 ? 2 : 0,
    }));
    redis.findOne.mockResolvedValue(
      JSON.stringify({
        period: StatisticsPeriod.MONTH,
        year: 2026,
        month: null,
        totalRevenue: '100.00',
        totalBookings: 2,
        buckets,
        isCached: false,
      }),
    );

    const result = await service.getRevenueAndBookings({
      period: StatisticsPeriod.MONTH,
      year: 2026,
    });

    expect(result.isCached).toBe(true);
    expect(bookingRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(paymentRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('groups database results and caches them with a TTL', async () => {
    redis.findOne.mockResolvedValue(null);
    paymentRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(
        createQueryBuilder([{ label: '2026-08', value: '250' }]),
      );
    bookingRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(createQueryBuilder([{ label: '2026-08', value: '3' }]));

    const result = await service.getRevenueAndBookings({
      period: StatisticsPeriod.MONTH,
      year: 2026,
    });

    expect(result.totalRevenue).toBe('250.00');
    expect(result.totalBookings).toBe(3);
    expect(result.buckets).toHaveLength(12);
    expect(result.buckets[7]).toEqual({
      label: '2026-08',
      revenue: '250.00',
      bookingCount: 3,
    });
    expect(redis.save).toHaveBeenCalledWith(
      expect.stringContaining('statistics:revenue-bookings:v1'),
      expect.any(String),
      300,
    );
  });

  it('returns the database result when writing Redis cache fails', async () => {
    redis.findOne.mockResolvedValue(null);
    redis.save.mockRejectedValue(new Error('Redis write unavailable'));
    paymentRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(
        createQueryBuilder([{ label: '2026-08', value: '250' }]),
      );
    bookingRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(createQueryBuilder([{ label: '2026-08', value: '3' }]));

    const result = await service.getRevenueAndBookings({
      period: StatisticsPeriod.MONTH,
      year: 2026,
    });

    expect(result.totalRevenue).toBe('250.00');
    expect(result.totalBookings).toBe(3);
  });

  it('rejects the request when mandatory Redis cache is unavailable', async () => {
    redis.findOne.mockRejectedValue(new Error('Redis unavailable'));

    await expect(
      service.getRevenueAndBookings({
        period: StatisticsPeriod.MONTH,
        year: 2026,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(bookingRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('removes an invalid cache payload before regenerating statistics', async () => {
    redis.findOne.mockResolvedValueOnce('{}').mockResolvedValue(null);
    paymentRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(createQueryBuilder([]));
    bookingRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(createQueryBuilder([]));

    const result = await service.getRevenueAndBookings({
      period: StatisticsPeriod.QUARTER,
      year: 2026,
    });

    expect(redis.delete).toHaveBeenCalledTimes(1);
    expect(result.buckets).toHaveLength(4);
  });

  it('waits for the lock owner instead of querying PostgreSQL again', async () => {
    const buckets = Array.from({ length: 4 }, (_, index) => ({
      label: `2026-Q${index + 1}`,
      revenue: '0.00',
      bookingCount: 0,
    }));
    redis.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(
      JSON.stringify({
        period: StatisticsPeriod.QUARTER,
        year: 2026,
        month: null,
        totalRevenue: '0.00',
        totalBookings: 0,
        buckets,
        isCached: false,
      }),
    );
    redis.acquireLock.mockResolvedValue(false);

    const result = await service.getRevenueAndBookings({
      period: StatisticsPeriod.QUARTER,
      year: 2026,
    });

    expect(result.isCached).toBe(true);
    expect(paymentRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(bookingRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns every day of the selected month including empty days', async () => {
    redis.findOne.mockResolvedValue(null);
    paymentRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(createQueryBuilder([]));
    bookingRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(createQueryBuilder([]));

    const result = await service.getRevenueAndBookings({
      period: StatisticsPeriod.DAY,
      year: 2024,
      month: 2,
    });

    expect(result.buckets).toHaveLength(29);
    expect(result.buckets[28].label).toBe('2024-02-29');
  });
});
