import { Expose } from 'class-transformer';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomViewType } from '../enums/room-view-type.enum';

export class RoomResponseDto {
  @Expose()
  id!: string;

  @Expose()
  roomNumber!: string;

  @Expose()
  name!: string;

  @Expose()
  roomType!: string | null;

  @Expose()
  description!: string | null;

  @Expose()
  viewType!: RoomViewType | null;

  @Expose()
  pricePerNight!: number;

  @Expose()
  capacity!: number;

  @Expose()
  status!: RoomStatus;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
