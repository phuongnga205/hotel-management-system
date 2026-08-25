import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min, Validate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { StatisticsPeriod } from '../enums/statistics-period.enum';
import { STATISTICS } from '../statistics.constants';
import { StatisticsMonthValidator } from '../validators/statistics-month.validator';

export class StatisticsQueryDto {
  @ApiProperty({ enum: StatisticsPeriod, example: StatisticsPeriod.MONTH })
  @IsEnum(StatisticsPeriod, {
    message: i18nValidationMessage('messages.STATISTICS.INVALID_PERIOD'),
  })
  period!: StatisticsPeriod;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('messages.STATISTICS.INVALID_YEAR'),
  })
  @Min(STATISTICS.MIN_YEAR, {
    message: i18nValidationMessage('messages.STATISTICS.INVALID_YEAR'),
  })
  @Max(STATISTICS.MAX_YEAR, {
    message: i18nValidationMessage('messages.STATISTICS.INVALID_YEAR'),
  })
  year!: number;

  @ApiPropertyOptional({
    description: 'Required when period is DAY',
    minimum: STATISTICS.FIRST_MONTH,
    maximum: STATISTICS.LAST_MONTH,
    example: 8,
  })
  @Type(() => Number)
  @Validate(StatisticsMonthValidator, {
    message: i18nValidationMessage('messages.STATISTICS.INVALID_MONTH'),
  })
  month?: number;
}
