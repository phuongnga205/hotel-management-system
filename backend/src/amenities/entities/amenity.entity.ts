import {
    Column,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { RoomAmenity } from './room-amenity.entity';

@Entity('amenities')
export class Amenity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        length: 100,
        unique: true,
    })
    name!: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    description?: string | null;

    @OneToMany(
        () => RoomAmenity,
        (roomAmenity) => roomAmenity.amenity,
    )
    roomAmenities?: RoomAmenity[];
}