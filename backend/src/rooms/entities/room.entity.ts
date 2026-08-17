import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
  viewType?: string | null;

  @Column({ name: 'price_per_night', type: 'numeric' })
  price: number;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'varchar', default: 'AVAILABLE' })
  status: string;

  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt?: Date | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt?: Date | null;
}
