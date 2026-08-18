import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { RoomAmenity } from '../../amenities/entities/room-amenity.entity';
import { Image } from '../../images/entities/image.entity';

export enum RoomStatus {
    AVAILABLE = 'AVAILABLE',
    OCCUPIED = 'OCCUPIED',
    MAINTENANCE = 'MAINTENANCE',
}
@Entity('rooms')
export class Room {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'room_number', unique: true, length: 50 })
    roomNumber!: string;

    @Column({ length: 255 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ name: 'view_type', length: 50, nullable: true })
    viewType?: string|null;

    @Column()
    capacity!: number;

    @Column({
        name: 'price_per_night',
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    pricePerNight!: string;

    @Column({
        length: 20,
        default: RoomStatus.AVAILABLE,
    })
    status!: RoomStatus;

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

    @OneToMany(() => Booking, (booking) => booking.room)
    bookings?: Booking[];

    @OneToMany(() => RoomAmenity, (roomAmenity) => roomAmenity.room)
    roomAmenities?: RoomAmenity[];

    @OneToMany(() => Image, (image) => image.room)
    images?: Image[];

    /*@OneToMany(() => Review, (review) => review.room)
    reviews?: Review[];*/
}