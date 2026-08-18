import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Room } from '../../rooms/entities/room.entity';

export enum BookingStatus {
    PENDING = 'PENDING',//đợi admin confirm
    CONFIRMED = 'ACCEPTED',//admin confirm request
    CANCELLED = 'CANCELLED',//admin hoặc user hủy request
}
export enum PaymentStatus {
    UNPAID = 'UNPAID',//sau admin confirm có thể trả tiền
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
    checkInDate!: Date;

    @Column({ name: 'check_out_date', type: 'date' })
    checkOutDate!: Date;

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

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamp',
    })
    createdAt?: Date;
    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamp',
    })
    updatedAt?: Date;
    @DeleteDateColumn({
        name: 'deleted_at',
        type: 'timestamp',
        nullable: true,
    })
    deletedAt?: Date | null;

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