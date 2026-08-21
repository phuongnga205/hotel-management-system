import { Expose } from 'class-transformer';

export class RoomImageResponseDto {
  @Expose()
  id!: string;

  @Expose()
  roomId!: string;

  @Expose()
  imageUrl!: string;

  @Expose()
  isThumbnail!: boolean;

  @Expose()
  createdAt!: Date;
}
