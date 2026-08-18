import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
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
    @OneToMany(
        () => RoomAmenity,
        (roomAmenity) => roomAmenity.amenity,
    )
    roomAmenities?: RoomAmenity[];
}