import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
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

    @ManyToOne(() => Room, (room) => room.images, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'room_id' })
    room?: Room;
}