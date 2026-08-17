import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Room } from '../../rooms/entities/room.entity';

export enum BookingStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
}
export enum PaymentStatus {
    UNPAID = 'UNPAID',
    PAID = 'PAID',
    REFUNDED = 'REFUNDED',
}
@Entity('bookings')
export class Booking {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ name: 'room_id' })
    roomId!: number;

    @Column({ name: 'check_in_date', type: 'date' })
    checkInDate!: string;

    @Column({ name: 'check_out_date', type: 'date' })
    checkOutDate!: string;

    @Column({
        name: 'total_amount',
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    totalAmount!: string;

    @Column({
        name: 'payment_status',
        length: 20,
        default: PaymentStatus.UNPAID,
    })
    paymentStatus!: PaymentStatus;

    @Column({
        length: 20,
        default: BookingStatus.PENDING,
    })
    status!: BookingStatus;

    @Column({
        type: 'text',
        nullable: true,
    })
    note?: string | null;

    @ManyToOne(() => User, (user) => user.bookings, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @ManyToOne(() => Room, (room) => room.bookings, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'room_id' })
    room!: Room;
}