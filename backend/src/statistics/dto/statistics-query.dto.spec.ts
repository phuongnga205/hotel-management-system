import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StatisticsPeriod } from '../enums/statistics-period.enum';
import { StatisticsQueryDto } from './statistics-query.dto';

describe('StatisticsQueryDto', () => {
  it('uses i18n validation keys for an invalid period and year', async () => {
    const dto = plainToInstance(StatisticsQueryDto, {
      period: 'WEEK',
      year: 'not-a-year',
    });

    const errors = await validate(dto);
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );

    expect(
      messages.some((message) =>
        message.startsWith('messages.STATISTICS.INVALID_PERIOD|'),
      ),
    ).toBe(true);
    expect(
      messages.some((message) =>
        message.startsWith('messages.STATISTICS.INVALID_YEAR|'),
      ),
    ).toBe(true);
  });

  it('requires a month for daily statistics', async () => {
    const dto = plainToInstance(StatisticsQueryDto, {
      period: StatisticsPeriod.DAY,
      year: '2026',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('accepts monthly statistics without a month', async () => {
    const dto = plainToInstance(StatisticsQueryDto, {
      period: StatisticsPeriod.MONTH,
      year: '2026',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a month for monthly statistics', async () => {
    const dto = plainToInstance(StatisticsQueryDto, {
      period: StatisticsPeriod.MONTH,
      year: '2026',
      month: '8',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
