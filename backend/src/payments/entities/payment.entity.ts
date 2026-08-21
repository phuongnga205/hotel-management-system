import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity({ name: 'payments' })
@Check('chk_payments_amount', '"amount" >= 0')
@Check(
  'chk_payments_status',
  `"status" IN ('PENDING','SUCCESS','FAILED','REFUNDED')`,
)
@Index('idx_payments_status', ['status'])
@Index('uq_payments_transaction_id', ['transactionId'], {
  unique: true,
  where: '"transaction_id" IS NOT NULL',
})
// One booking can have several payments over its lifetime (original charge,
// refund, retry after a failure), so this is many-to-one, not one-to-one.
export class Payment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId!: string;

  @ManyToOne(() => Booking, (booking) => booking.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 30 })
  method!: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    name: 'transaction_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionId!: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
