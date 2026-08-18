import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';

@Entity('images')
// Enforce at most one active thumbnail per room.
@Index('uq_images_one_thumbnail_per_room', ['roomId'], {
  unique: true,
  where: `"is_thumbnail" = true AND "deleted_at" IS NULL`,
})
export class Image {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({
    name: 'room_id',
    type: 'bigint',
  })
  roomId!: string;

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

  @ManyToOne(() => Room, (room) => room.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_id' })
  room?: Room;
}
