import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reviews')
@Check('chk_reviews_rating', '"rating" BETWEEN 1 AND 5')
export class Review {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  // One review per booking — reviews cannot be edited, only deleted.
  @Column({ name: 'booking_id', type: 'bigint', unique: true })
  bookingId!: string;

  @OneToOne(() => Booking, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'room_id', type: 'bigint' })
  roomId!: string;

  @ManyToOne(() => Room, (room) => room.reviews, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'room_id' })
  room?: Room;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.reviews, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  // Reason recorded when an admin deletes an inappropriate review.
  @Column({ name: 'delete_reason', type: 'text', nullable: true })
  deleteReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt?: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
