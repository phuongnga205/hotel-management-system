import { Expose, Transform, Type } from 'class-transformer';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomViewType } from '../enums/room-view-type.enum';
import { RoomAmenity } from '../../amenities/entities/room-amenity.entity';
import { Image } from '../../images/entities/image.entity';
import { RoomImageResponseDto } from './room-image-response.dto';

export class RoomAmenitySummaryDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
}

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

  // Chỉ có giá trị khi query load kèm relation `roomAmenities.amenity`
  // (RoomsService.listRooms()/findOne()/findAvailableRooms()) — undefined
  // (bị JSON.stringify bỏ qua) nghĩa là "chưa load", không phải "không có
  // tiện nghi nào". Không expose ở response của create()/update() vì 2
  // thao tác đó không load lại relation ngay sau khi ghi.
  @Expose()
  @Type(() => RoomAmenitySummaryDto)
  @Transform(({ obj }: { obj: { roomAmenities?: RoomAmenity[] } }) =>
    obj.roomAmenities?.map((roomAmenity) => ({
      id: roomAmenity.amenity?.id,
      name: roomAmenity.amenity?.name,
    })),
  )
  amenities?: RoomAmenitySummaryDto[];

  // Cùng quy ước với `amenities` ở trên — chỉ có giá trị khi query load kèm
  // relation `images` (RoomsService.listRooms()/findOne()/
  // findAvailableRooms()), undefined nghĩa là "chưa load".
  @Expose()
  @Type(() => RoomImageResponseDto)
  @Transform(({ obj }: { obj: { images?: Image[] } }) =>
    obj.images?.map((image) => ({
      id: image.id,
      roomId: image.roomId,
      imageUrl: image.imageUrl,
      isThumbnail: image.isThumbnail,
      createdAt: image.createdAt,
    })),
  )
  images?: RoomImageResponseDto[];
}
