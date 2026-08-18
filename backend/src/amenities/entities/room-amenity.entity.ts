import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';
import { Amenity } from '../../amenities/entities/amenity.entity';

@Entity('room_amenities')
export class RoomAmenity {
  @PrimaryColumn({ name: 'room_id', type: 'bigint' })
  roomId!: string;

  @PrimaryColumn({ name: 'amenity_id', type: 'bigint' })
  amenityId!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt?: Date;

  // Pure join table: the mapping goes away with either side, no soft delete.
  @ManyToOne(() => Room, (room) => room.roomAmenities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => Amenity, (amenity) => amenity.roomAmenities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'amenity_id' })
  amenity!: Amenity;
}
