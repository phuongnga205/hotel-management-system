import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { I18nService } from 'nestjs-i18n';
import { Booking } from '../bookings/entities/booking.entity';
import { ENVIRONMENT_KEYS } from '../config/environment.constants';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { RedisUtil } from '../token/redis.util';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { StatisticsPeriod } from './enums/statistics-period.enum';
import {
  STATISTICS,
  STATISTICS_BUCKET_FORMAT,
  STATISTICS_CACHE_ALL_PERIODS,
  STATISTICS_DATE_TRUNC_UNIT,
  STATISTICS_FORMATTED_MONEY_PATTERN,
  STATISTICS_MONEY_PATTERN,
} from './statistics.constants';
import { StatisticsLogger } from './statistics.logger';

interface AggregateRow {
  label: string;
  value: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface StatisticsBucket {
  label: string;
  revenue: string;
  bookingCount: number;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly redis: RedisUtil,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly logger: StatisticsLogger,
  ) {}

  async getRevenueAndBookings(
    query: StatisticsQueryDto,
  ): Promise<StatisticsResponseDto> {
    const cacheKey = this.buildCacheKey(query);
    const cached = await this.readCache(cacheKey, query);
    if (cached) {
      return this.toResponse({ ...cached, isCached: true });
    }

    const lockKey = `${cacheKey}:${STATISTICS.CACHE_LOCK_SUFFIX}`;
    const lockToken = randomUUID();
    const isLockOwner = await this.acquireLock(lockKey, lockToken);
    if (!isLockOwner) return this.waitForCachedResponse(cacheKey, query);

    try {
      const cachedAfterLock = await this.readCache(cacheKey, query);
      if (cachedAfterLock) {
        return this.toResponse({ ...cachedAfterLock, isCached: true });
      }

      const range = this.getDateRange(query);
      const [revenueRows, bookingRows] = await Promise.all([
        this.queryRevenue(query.period, range),
        this.queryBookings(query.period, range),
      ]);
      const response = this.buildResponse(query, revenueRows, bookingRows);

      await this.writeCache(cacheKey, response);
      return this.toResponse(response);
    } finally {
      await this.releaseLock(lockKey, lockToken);
    }
  }

  private queryRevenue(
    period: StatisticsPeriod,
    range: DateRange,
  ): Promise<AggregateRow[]> {
    const bucket = this.getBucketExpression('payment.paidAt', period);
    return this.paymentRepository
      .createQueryBuilder('payment')
      .select(bucket, 'label')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'value')
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .andWhere('payment.paidAt IS NOT NULL')
      .andWhere(
        'payment.paidAt >= (:startDate::timestamp AT TIME ZONE :timeZone)',
      )
      .andWhere('payment.paidAt < (:endDate::timestamp AT TIME ZONE :timeZone)')
      .setParameters({
        ...range,
        timeZone: this.getTimeZone(),
      })
      .groupBy(bucket)
      .orderBy(bucket, 'ASC')
      .getRawMany<AggregateRow>();
  }

  private queryBookings(
    period: StatisticsPeriod,
    range: DateRange,
  ): Promise<AggregateRow[]> {
    const bucket = this.getBucketExpression('booking.createdAt', period);
    return this.bookingRepository
      .createQueryBuilder('booking')
      .select(bucket, 'label')
      .addSelect('COUNT(booking.id)', 'value')
      .where(
        'booking.createdAt >= (:startDate::timestamp AT TIME ZONE :timeZone)',
      )
      .andWhere(
        'booking.createdAt < (:endDate::timestamp AT TIME ZONE :timeZone)',
      )
      .setParameters({
        ...range,
        timeZone: this.getTimeZone(),
      })
      .groupBy(bucket)
      .orderBy(bucket, 'ASC')
      .getRawMany<AggregateRow>();
  }

  private getBucketExpression(
    column: string,
    period: StatisticsPeriod,
  ): string {
    const unit = STATISTICS_DATE_TRUNC_UNIT[period];
    const format = STATISTICS_BUCKET_FORMAT[period];
    return `TO_CHAR(DATE_TRUNC('${unit}', ${column} AT TIME ZONE :timeZone), '${format}')`;
  }

  private buildResponse(
    query: StatisticsQueryDto,
    revenueRows: AggregateRow[],
    bookingRows: AggregateRow[],
  ): StatisticsResponseDto {
    const revenueByLabel = new Map<string, bigint>(
      revenueRows.map(({ label, value }) => [
        label,
        this.parseMoneyToMinorUnits(value),
      ]),
    );
    const bookingsByLabel = new Map(
      bookingRows.map(({ label, value }) => [label, Number(value)]),
    );
    const buckets: StatisticsBucket[] = this.createLabels(query).map(
      (label) => ({
        label,
        revenue: this.formatMinorUnits(revenueByLabel.get(label) ?? 0n),
        bookingCount: bookingsByLabel.get(label) ?? 0,
      }),
    );
    const totalRevenue = buckets.reduce(
      (total, bucket) => total + this.parseMoneyToMinorUnits(bucket.revenue),
      0n,
    );

    return this.toResponse({
      period: query.period,
      year: query.year,
      month: this.getSelectedMonth(query),
      totalRevenue: this.formatMinorUnits(totalRevenue),
      totalBookings: buckets.reduce(
        (sum, bucket) => sum + bucket.bookingCount,
        0,
      ),
      buckets,
      isCached: false,
    });
  }

  private createLabels(query: StatisticsQueryDto): string[] {
    if (query.period === StatisticsPeriod.DAY) {
      const month = query.month as number;
      const days = new Date(Date.UTC(query.year, month, 0)).getUTCDate();
      return Array.from({ length: days }, (_, index) =>
        this.formatDateLabel(query.year, month, index + 1),
      );
    }

    if (query.period === StatisticsPeriod.MONTH) {
      return Array.from(
        { length: STATISTICS.LAST_MONTH },
        (_, index) => `${query.year}-${this.pad(index + 1)}`,
      );
    }

    return Array.from(
      { length: STATISTICS.QUARTERS_PER_YEAR },
      (_, index) => `${query.year}-Q${index + 1}`,
    );
  }

  private getDateRange(query: StatisticsQueryDto): DateRange {
    if (query.period === StatisticsPeriod.DAY) {
      const month = query.month as number;
      const nextYear =
        month === STATISTICS.LAST_MONTH ? query.year + 1 : query.year;
      const nextMonth =
        month === STATISTICS.LAST_MONTH ? STATISTICS.FIRST_MONTH : month + 1;
      return {
        startDate: this.formatDateLabel(query.year, month, 1),
        endDate: this.formatDateLabel(nextYear, nextMonth, 1),
      };
    }

    return {
      startDate: this.formatDateLabel(query.year, STATISTICS.FIRST_MONTH, 1),
      endDate: this.formatDateLabel(query.year + 1, STATISTICS.FIRST_MONTH, 1),
    };
  }

  private formatDateLabel(year: number, month: number, day: number): string {
    return `${year}-${this.pad(month)}-${this.pad(day)}`;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  private buildCacheKey(query: StatisticsQueryDto): string {
    return [
      STATISTICS.CACHE_KEY_PREFIX,
      query.period,
      query.year,
      this.getSelectedMonth(query) ?? STATISTICS_CACHE_ALL_PERIODS,
      this.getTimeZone(),
    ].join(':');
  }

  private getTimeZone(): string {
    return this.configService.get<string>(
      ENVIRONMENT_KEYS.STATISTICS_TIME_ZONE,
      STATISTICS.DEFAULT_TIME_ZONE,
    );
  }

  private getCacheTtl(): number {
    const configuredTtl = Number(
      this.configService.get<string | number>(
        ENVIRONMENT_KEYS.STATISTICS_CACHE_TTL_SECONDS,
        STATISTICS.DEFAULT_CACHE_TTL_SECONDS,
      ),
    );
    return Number.isInteger(configuredTtl) && configuredTtl > 0
      ? configuredTtl
      : STATISTICS.DEFAULT_CACHE_TTL_SECONDS;
  }

  private getSelectedMonth(query: StatisticsQueryDto): number | null {
    return query.period === StatisticsPeriod.DAY ? (query.month ?? null) : null;
  }

  private async readCache(
    key: string,
    query?: StatisticsQueryDto,
  ): Promise<StatisticsResponseDto | null> {
    let value: string | null;
    try {
      value = await this.redis.findOne(key);
    } catch (error: unknown) {
      this.logger.error({
        message:
          'Statistics cache read failed; restore Redis before retrying this request',
        cacheKey: key,
        error,
      });
      throw this.cacheUnavailableException();
    }

    if (!value) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error: unknown) {
      this.logger.warn({
        message:
          'Statistics cache contains invalid JSON; removing and regenerating it',
        cacheKey: key,
        error,
      });
      await this.deleteInvalidCache(key);
      return null;
    }

    if (!this.isValidCachedResponse(parsed, query)) {
      this.logger.warn({
        message:
          'Statistics cache payload failed schema validation; removing and regenerating it',
        cacheKey: key,
      });
      await this.deleteInvalidCache(key);
      return null;
    }
    return parsed;
  }

  private async writeCache(
    key: string,
    response: StatisticsResponseDto,
  ): Promise<void> {
    try {
      await this.redis.save(key, JSON.stringify(response), this.getCacheTtl());
    } catch (error: unknown) {
      this.logger.error({
        message:
          'Statistics cache write failed; restore Redis before retrying this request',
        cacheKey: key,
        error,
      });
      throw this.cacheUnavailableException();
    }
  }

  private async deleteInvalidCache(key: string): Promise<void> {
    try {
      await this.redis.delete(key);
    } catch (error: unknown) {
      this.logger.error({
        message:
          'Invalid statistics cache could not be removed; restore Redis before retrying',
        cacheKey: key,
        error,
      });
      throw this.cacheUnavailableException();
    }
  }

  private async acquireLock(key: string, token: string): Promise<boolean> {
    try {
      return await this.redis.acquireLock(
        key,
        token,
        STATISTICS.LOCK_TTL_SECONDS,
      );
    } catch (error: unknown) {
      this.logger.error({
        message: 'Statistics cache lock failed; restore Redis before retrying',
        cacheKey: key,
        error,
      });
      throw this.cacheUnavailableException();
    }
  }

  private async releaseLock(key: string, token: string): Promise<void> {
    try {
      await this.redis.releaseLock(key, token);
    } catch (error: unknown) {
      this.logger.error({
        message:
          'Statistics cache lock release failed; verify Redis health and lock TTL',
        cacheKey: key,
        error,
      });
    }
  }

  private async waitForCachedResponse(
    cacheKey: string,
    query: StatisticsQueryDto,
  ): Promise<StatisticsResponseDto> {
    for (
      let attempt = 0;
      attempt < STATISTICS.CACHE_WAIT_ATTEMPTS;
      attempt += 1
    ) {
      await this.delay(STATISTICS.CACHE_WAIT_INTERVAL_MILLISECONDS);
      const cached = await this.readCache(cacheKey, query);
      if (cached) return this.toResponse({ ...cached, isCached: true });
    }

    throw new ServiceUnavailableException(
      this.i18n.t('messages.STATISTICS.GENERATION_IN_PROGRESS'),
    );
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private isValidCachedResponse(
    value: unknown,
    query?: StatisticsQueryDto,
  ): value is StatisticsResponseDto {
    if (!value || typeof value !== 'object') return false;
    const response = value as Record<string, unknown>;
    if (
      !Object.values(StatisticsPeriod).includes(
        response.period as StatisticsPeriod,
      ) ||
      typeof response.year !== 'number' ||
      !(response.month === null || typeof response.month === 'number') ||
      typeof response.totalRevenue !== 'string' ||
      !STATISTICS_FORMATTED_MONEY_PATTERN.test(response.totalRevenue) ||
      !Number.isSafeInteger(response.totalBookings) ||
      Number(response.totalBookings) < 0 ||
      typeof response.isCached !== 'boolean' ||
      !Array.isArray(response.buckets)
    ) {
      return false;
    }

    if (
      query &&
      (response.period !== query.period ||
        response.year !== query.year ||
        response.month !== this.getSelectedMonth(query))
    ) {
      return false;
    }

    const expectedLabels = query ? this.createLabels(query) : null;
    const cachedBuckets: unknown[] = response.buckets;
    if (expectedLabels && cachedBuckets.length !== expectedLabels.length) {
      return false;
    }
    const areBucketsValid = cachedBuckets.every((bucket, index) => {
      if (!bucket || typeof bucket !== 'object') return false;
      const item = bucket as Record<string, unknown>;
      return (
        typeof item.label === 'string' &&
        (!expectedLabels || item.label === expectedLabels[index]) &&
        typeof item.revenue === 'string' &&
        STATISTICS_FORMATTED_MONEY_PATTERN.test(item.revenue) &&
        Number.isSafeInteger(item.bookingCount) &&
        Number(item.bookingCount) >= 0
      );
    });
    if (!areBucketsValid) return false;

    try {
      const validatedBuckets = cachedBuckets as StatisticsBucket[];
      const totals = validatedBuckets.reduce(
        (result, bucket) => ({
          revenue: result.revenue + this.parseMoneyToMinorUnits(bucket.revenue),
          bookings: result.bookings + bucket.bookingCount,
        }),
        { revenue: 0n, bookings: 0 },
      );
      return (
        this.formatMinorUnits(totals.revenue) === response.totalRevenue &&
        totals.bookings === response.totalBookings
      );
    } catch {
      return false;
    }
  }

  private parseMoneyToMinorUnits(value: string): bigint {
    if (!STATISTICS_MONEY_PATTERN.test(value)) {
      throw new InternalServerErrorException(
        this.i18n.t('messages.STATISTICS.INVALID_REVENUE_DATA'),
      );
    }
    const [whole, fraction = ''] = value.split('.');
    const normalizedFraction = fraction.padEnd(STATISTICS.MONEY_SCALE, '0');
    return (
      BigInt(whole) * 10n ** BigInt(STATISTICS.MONEY_SCALE) +
      BigInt(normalizedFraction)
    );
  }

  private formatMinorUnits(value: bigint): string {
    const divisor = 10n ** BigInt(STATISTICS.MONEY_SCALE);
    const whole = value / divisor;
    const fraction = String(value % divisor).padStart(
      STATISTICS.MONEY_SCALE,
      '0',
    );
    return `${whole}.${fraction}`;
  }

  private cacheUnavailableException(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      this.i18n.t('messages.STATISTICS.CACHE_UNAVAILABLE'),
    );
  }

  private toResponse(
    value: Partial<StatisticsResponseDto>,
  ): StatisticsResponseDto {
    return plainToInstance(StatisticsResponseDto, value, {
      excludeExtraneousValues: true,
    });
  }
}
