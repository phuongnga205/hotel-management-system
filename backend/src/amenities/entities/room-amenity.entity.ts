import {
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';
import { Amenity } from '../../amenities/entities/amenity.entity';

@Entity('room_amenities')
export class RoomAmenity {
    @PrimaryColumn({ name: 'room_id' })
    roomId!: number;

    @PrimaryColumn({ name: 'amenity_id' })
    amenityId!: number;

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
    @ManyToOne(() => Room, (room) => room.roomAmenities, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'room_id' })
    room?: Room;

    @ManyToOne(() => Amenity, (amenity) => amenity.roomAmenities, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'amenity_id' })
    amenity?: Amenity;
}