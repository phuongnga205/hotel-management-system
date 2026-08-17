import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';

@Entity('images')
export class Image {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        name: 'room_id',
    })
    roomId!: number;

    @Column({
        name: 'image_url',
        length: 500,
    })
    imageUrl!: string;

    @Column({
        name: 'is_thumbnail',
        default: false,
    })
    isThumbnail?: boolean;

    @ManyToOne(() => Room, (room) => room.images, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'room_id' })
    room?: Room;
}