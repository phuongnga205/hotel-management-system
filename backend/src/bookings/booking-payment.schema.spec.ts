import { getMetadataArgsStorage } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';

describe('Booking and Payment schema', () => {
  const expectedStatuses = ['PENDING', 'ACCEPTED', 'CANCELLED'];

  it('uses the required Booking status enum values', () => {
    expect(Object.values(BookingStatus)).toEqual(expectedStatuses);
    expect(getColumnOptions(Booking, 'status').enum).toBe(BookingStatus);
    expect(getColumnOptions(Booking, 'status').default).toBe(
      BookingStatus.PENDING,
    );
  });

  it('uses the required Payment status enum values', () => {
    expect(Object.values(PaymentStatus)).toEqual(expectedStatuses);
    expect(getColumnOptions(Payment, 'status').enum).toBe(PaymentStatus);
    expect(getColumnOptions(Payment, 'status').default).toBe(
      PaymentStatus.PENDING,
    );
  });

  it('models one payment per booking', () => {
    const bookingRelation = getMetadataArgsStorage().relations.find(
      ({ target, propertyName }) =>
        target === Payment && propertyName === 'booking',
    );
    const bookingJoinColumn = getMetadataArgsStorage().joinColumns.find(
      ({ target, propertyName }) =>
        target === Payment && propertyName === 'booking',
    );

    expect(bookingRelation?.relationType).toBe('one-to-one');
    expect(bookingRelation?.options.nullable).toBe(false);
    expect(bookingJoinColumn?.name).toBe('booking_id');
  });
});

function getColumnOptions(
  target: typeof Booking | typeof Payment,
  propertyName: string,
): Record<string, unknown> {
  const column = getMetadataArgsStorage().columns.find(
    (metadata) =>
      metadata.target === target && metadata.propertyName === propertyName,
  );

  if (!column) {
    throw new TypeError(
      `Missing ${target.name}.${propertyName} column metadata`,
    );
  }

  return column.options as Record<string, unknown>;
}
