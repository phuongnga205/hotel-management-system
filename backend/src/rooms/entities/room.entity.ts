import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomViewType } from '../enums/room-view-type.enum';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_number', type: 'varchar', unique: true })
  roomNumber: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'view_type', type: 'varchar', nullable: true })
  viewType?: RoomViewType | null;

  @Column({ name: 'price_per_night', type: 'numeric' })
  price: number;

  @Column({ type: 'int' })
  capacity: number;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.AVAILABLE,
  })
  status: RoomStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
