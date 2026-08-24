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

  // pricePerNight lưu dưới dạng Decimal (decimal.js) ở entity để tránh sai
  // số floating point khi tính toán. @Type(() => String) bắt buộc phải có:
  // không có nó, class-transformer thấy value là 1 object (Decimal instance,
  // không phải Object thường) và tự đoán targetType = Decimal rồi gọi
  // `new Decimal()` (không đối số) để dựng lại — throw ngay lập tức. Khai
  // báo String ép class-transformer chỉ gọi String(value) (dùng
  // Decimal#toString() có sẵn), không phơi bày kiểu Decimal ra ngoài API.
  @Expose()
  @Type(() => String)
  pricePerNight!: string;

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
