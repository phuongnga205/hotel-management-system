import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { Room } from '../../rooms/entities/room.entity';

@Entity({ name: 'bookings' })
@Check('CHK_bookings_dates', '"check_out_date" > "check_in_date"')
@Check('CHK_bookings_guest_count', '"guest_count" > 0')
@Check('CHK_bookings_total_amount', '"total_amount" >= 0')
@Index('IDX_bookings_user_id', ['userId'])
@Index('IDX_bookings_room_id', ['roomId'])
@Index('IDX_bookings_status', ['status'])
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'room_id', type: 'bigint' })
  roomId: string;

  @ManyToOne(() => Room, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: string;

  @Column({ name: 'guest_count', type: 'int' })
  guestCount: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ name: 'special_request', type: 'text', nullable: true })
  specialRequest: string | null;

  @OneToOne(() => Payment, (payment) => payment.booking)
  payment: Payment | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
