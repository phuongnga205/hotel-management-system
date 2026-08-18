import { Expose } from 'class-transformer';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomViewType } from '../enums/room-view-type.enum';

export class RoomResponseDto {
  @Expose()
  id: number;

  @Expose()
  roomNumber: string;

  @Expose()
  name: string;

  @Expose()
  description: string | null;

  @Expose()
  viewType: RoomViewType | null;

  @Expose()
  price: number;

  @Expose()
  capacity: number;

  @Expose()
  status: RoomStatus;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
