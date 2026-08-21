import {
  Check,
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
import { Review } from '../../reviews/entities/review.entity';
import { RoomViewType } from '../enums/room-view-type.enum';
import { RoomStatus } from '../enums/room-status.enum';
import {
  ROOM_STATUS_CHECK_CONSTRAINT,
  ROOM_STATUS_CHECK_EXPRESSION,
} from '../constants/room-status.constants';

@Entity('rooms')
@Check(ROOM_STATUS_CHECK_CONSTRAINT, ROOM_STATUS_CHECK_EXPRESSION)
export class Room {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'room_number', unique: true, length: 20 })
  roomNumber!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({
    name: 'room_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  roomType?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // Plain varchar, not a native Postgres enum — kept consistent with the
  // rest of the schema, which uses varchar + CHECK for all status-like columns.
  @Column({ name: 'view_type', type: 'varchar', length: 50, nullable: true })
  viewType?: RoomViewType | null;

  @Column({ type: 'smallint' })
  capacity!: number;

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
    length: 20,
    default: RoomStatus.ACTIVE,
  })
  status!: RoomStatus;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt?: Date;
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt?: Date;
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt?: Date | null;

  @OneToMany(() => Booking, (booking) => booking.room)
  bookings?: Booking[];

  @OneToMany(() => RoomAmenity, (roomAmenity) => roomAmenity.room)
  roomAmenities?: RoomAmenity[];

  @OneToMany(() => Image, (image) => image.room)
  images?: Image[];

  @OneToMany(() => Review, (review) => review.room)
  reviews?: Review[];
}
