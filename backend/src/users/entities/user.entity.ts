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

export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
}
export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}
@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        length: 100,
        unique: true,
    })
    username!: string;

    @Column({
        length: 20,
        unique: true,
        nullable: true,
    })
    phone!: string| null;

    @Column({
        length: 255,
        unique: true,
    })
    email!: string;

    @Column({
        length: 255,
    })
    password!: string;

    @Column({
        length: 20,
        default: UserStatus.ACTIVE,
    })
    status!: UserStatus;

    @Column({
        name: 'avatar_url',
        length: 500,
        nullable: true,
    })
    avatarUrl?: string|null;

    @Column({
        length: 20,
        default: UserRole.USER,
    })
    role!: UserRole;

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

    @OneToMany(() => Booking, (booking) => booking.user)
    bookings?: Booking[];

    /*@OneToMany(() => Review, (review) => review.user)
    reviews?: Review[];*/
}