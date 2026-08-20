import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { StatisticsPeriod } from '../enums/statistics-period.enum';
import { STATISTICS } from '../statistics.constants';

@ValidatorConstraint({ name: 'statisticsMonth', async: false })
export class StatisticsMonthValidator implements ValidatorConstraintInterface {
  validate(value: unknown, arguments_: ValidationArguments): boolean {
    const dto = arguments_.object as { period?: StatisticsPeriod };

    if (dto.period !== StatisticsPeriod.DAY) return value === undefined;

    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= STATISTICS.FIRST_MONTH &&
      value <= STATISTICS.LAST_MONTH
    );
  }
}
