import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'bookings' })
@Check('chk_bookings_dates', '"check_out_date" > "check_in_date"')
@Check(
  'chk_bookings_status',
  `"status" IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')`,
)
@Index('idx_bookings_user_id', ['userId'])
@Index('idx_bookings_room_id', ['roomId'])
@Index('idx_bookings_status', ['status'])
@Index('idx_bookings_room_dates', ['roomId', 'checkInDate', 'checkOutDate'])
export class Booking {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;
  @ManyToOne(() => User, (user) => user.bookings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'room_id', type: 'bigint' })
  roomId!: string;

  @ManyToOne(() => Room, (room) => room.bookings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'room_id' })
  room?: Room;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate!: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate!: string;

  // Snapshot of the room's price at booking time — protects the booking
  // from later changes to rooms.price_per_night.
  @Column({
    name: 'price_per_night',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  pricePerNight!: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  totalPrice!: number;

  @Column({
    length: 20,
    default: BookingStatus.PENDING,
  })
  status!: BookingStatus;

  // For the "pay later" flow: PENDING bookings holding a slot must resolve
  // (payment or admin decision) before this timestamp, or be auto-expired.
  @Column({ name: 'hold_expires_at', type: 'timestamptz', nullable: true })
  holdExpiresAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  // Reason given on cancellation (by the user) or rejection (by admin).
  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string | null;

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments?: Payment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt?: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
