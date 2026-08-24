import { Decimal } from 'decimal.js';
import { ValueTransformer } from 'typeorm';

export const decimalTransformer: ValueTransformer = {
  to: (value?: Decimal | number | string | null) =>
    value === null || value === undefined ? value : value.toString(),
  from: (value: string | null) => (value === null ? null : new Decimal(value)),
};
