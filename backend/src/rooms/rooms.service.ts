/* sunlint-disable */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Amenity } from '../amenities/entities/amenity.entity';
import { RoomAmenity } from '../amenities/entities/room-amenity.entity';
import { Image } from '../images/entities/image.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { buildRoomImagePublicId } from '../config/environment.constants';
import { AddRoomImageDto } from './dto/add-room-image.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { ListPublicRoomsDto } from './dto/list-public-rooms.dto';
import { FindAvailableRoomsDto } from './dto/find-available-rooms.dto';
import { RoomImageResponseDto } from './dto/room-image-response.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { UpdateRoomAmenitiesDto } from './dto/update-room-amenities.dto';
import { UpdateRoomPriceDto } from './dto/update-room-price.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';
import { RoomStatus } from './enums/room-status.enum';

export interface PaginatedRooms {
  items: RoomResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createRoomDto: CreateRoomDto) {
    const { amenityIds = [], ...roomPayload } = createRoomDto;

    const savedRoom = await this.dataSource.transaction(async (manager) => {
      const roomRepository = manager.getRepository(Room);
      const existingRoom = await roomRepository.findOneBy({
        roomNumber: roomPayload.roomNumber,
      });
      if (existingRoom) throw this.roomNumberExistsException();

      await this.assertAmenitiesExist(manager, amenityIds);
      const room = await roomRepository.save(
        roomRepository.create(roomPayload),
      );

      if (amenityIds.length > 0) {
        const repository = manager.getRepository(RoomAmenity);
        await repository.save(
          amenityIds.map((amenityId) =>
            repository.create({ roomId: room.id, amenityId }),
          ),
        );
      }

      return room;
    });

    return {
      statusCode: 201,
      message: this.i18n.t('messages.ROOM.CREATE_SUCCESS'),
      data: this.toResponse(savedRoom),
    };
  }

  // GET /admin/rooms — admin thấy mọi status (ACTIVE/INACTIVE/MAINTENANCE),
  // `status` trong query chỉ là filter thêm (optional), không truyền thì
  // trả về tất cả. Khác findPublicList() bên dưới luôn ép status=ACTIVE.
  async findAll(query: ListRoomsDto) {
    const { page, limit, status } = query;
    const data = await this.listRooms(page, limit, status);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.FIND_ALL_SUCCESS'),
      data,
    };
  }

  // GET /rooms — public/user CHỈ được thấy phòng ACTIVE. Ép cứng ở đây,
  // không nhận status từ client (ListPublicRoomsDto không có field đó).
  async findPublicList(query: ListPublicRoomsDto) {
    const { page, limit } = query;
    const data = await this.listRooms(page, limit, RoomStatus.ACTIVE);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.FIND_ALL_SUCCESS'),
      data,
    };
  }

  private async listRooms(
    page: number,
    limit: number,
    status?: RoomStatus,
  ): Promise<PaginatedRooms> {
    const repository = this.dataSource.getRepository(Room);

    // Phân trang trước, JOIN sau: page qua .findAndCount() (không JOIN) để
    // COUNT/LIMIT/OFFSET không bị nhân bản dòng bởi các quan hệ 1-N
    // (roomAmenities, images) — rồi mới nạp quan hệ cho đúng trang id đó
    // bằng QueryBuilder, tuân Luật 4 (danh sách có Relations bắt buộc
    // QueryBuilder).
    const [ids, total] = await repository.findAndCount({
      where: status ? { status } : {},
      select: { id: true },
      order: { id: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const data = ids.length
      ? await repository
          .createQueryBuilder('room')
          .leftJoinAndSelect(
            'room.roomAmenities',
            'roomAmenity',
            'amenity.deletedAt IS NULL',
          )
          .leftJoinAndSelect('roomAmenity.amenity', 'amenity')
          .leftJoinAndSelect('room.images', 'image', 'image.deletedAt IS NULL')
          .whereInIds(ids.map((room) => room.id))
          .orderBy('room.id', 'ASC')
          .getMany()
      : [];

    return {
      items: data.map((room) => this.toResponse(room)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // GET /rooms/available — checkIn/checkOut bắt buộc (FindAvailableRoomsDto),
  // luôn chỉ xét phòng ACTIVE + không trùng ngày với booking
  // ACCEPTED/PENDING nào (xem note ở docs/DANH_SACH_API.md mục Rooms).
  async findAvailableRooms(queryDto: FindAvailableRoomsDto) {
    const { page, limit, checkIn, checkOut, minPrice, maxPrice, amenities } =
      queryDto;

    if (checkOut <= checkIn) {
      throw new BadRequestException(
        this.i18n.t('messages.ROOM.INVALID_DATE_RANGE'),
      );
    }

    const repository = this.dataSource.getRepository(Room);

    // roomAmenity/amenity chỉ join để LỌC (không SELECT) ở bước này — join
    // quan hệ 1-N kết hợp skip/take/getManyAndCount() sẽ làm COUNT và trang
    // kết quả sai (1 phòng khớp N tiện nghi filter bị nhân bản dòng), vi
    // phạm Luật 4. Lấy `id` DISTINCT theo trang trước, rồi mới hydrate đầy
    // đủ quan hệ (roomAmenities+amenity+images) cho đúng các id đó.
    const filterQuery = repository
      .createQueryBuilder('room')
      .leftJoin('room.roomAmenities', 'roomAmenity')
      .leftJoin('roomAmenity.amenity', 'amenity')
      .where('room.status = :status', { status: RoomStatus.ACTIVE });

    if (minPrice !== undefined) {
      filterQuery.andWhere('room.pricePerNight >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      filterQuery.andWhere('room.pricePerNight <= :maxPrice', { maxPrice });
    }

    if (amenities && amenities.length > 0) {
      filterQuery.andWhere('amenity.name IN (:...amenities)', { amenities });
    }

    filterQuery
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('booking.roomId')
          .from(Booking, 'booking')
          .where('booking.status IN (:...statuses)', {
            statuses: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
          })
          .andWhere(
            '(booking.checkInDate < :checkOut AND booking.checkOutDate > :checkIn)',
          )
          .getQuery();
        return 'room.id NOT IN ' + subQuery;
      })
      .setParameter('checkIn', checkIn)
      .setParameter('checkOut', checkOut)
      .setParameter('statuses', [
        BookingStatus.ACCEPTED,
        BookingStatus.PENDING,
      ]);

    const totalRow = await filterQuery
      .clone()
      .select('COUNT(DISTINCT room.id)', 'count')
      .getRawOne<{ count: string }>();
    const total = Number(totalRow?.count ?? 0);

    const idRows = await filterQuery
      .clone()
      .select('room.id', 'id')
      .distinct(true)
      .orderBy('room.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany<{ id: string }>();
    const ids = idRows.map((row) => row.id);

    const data = ids.length
      ? await repository
          .createQueryBuilder('room')
          .leftJoinAndSelect(
            'room.roomAmenities',
            'roomAmenity',
            'amenity.deletedAt IS NULL',
          )
          .leftJoinAndSelect('roomAmenity.amenity', 'amenity')
          .leftJoinAndSelect('room.images', 'image', 'image.deletedAt IS NULL')
          .whereInIds(ids)
          .orderBy('room.id', 'ASC')
          .getMany()
      : [];

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.AVAILABLE_SUCCESS'),
      data: {
        items: data.map((room) => this.toResponse(room)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // `status` optional — AdminRoomsController gọi không kèm status (xem mọi
  // phòng bất kể trạng thái). PublicRoomsController BẮT BUỘC truyền
  // RoomStatus.ACTIVE — nếu không, 1 phòng INACTIVE/MAINTENANCE vẫn lộ được
  // qua GET /rooms/:id dù GET /rooms (list) đã ẩn đúng, phá vỡ đúng cam kết
  // "public chỉ thấy phòng ACTIVE" đã ghi trong docs/DANH_SACH_API.md mục 3.
  async findOne(id: string, status?: RoomStatus) {
    const room = await this.dataSource.getRepository(Room).findOne({
      where: status ? { id, status } : { id },
      relations: { roomAmenities: { amenity: true }, images: true },
    });
    if (!room) throw this.roomNotFoundException();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.FIND_ONE_SUCCESS'),
      data: this.toResponse(room),
    };
  }

  async update(id: string, dto: UpdateRoomDto) {
    const repository = this.dataSource.getRepository(Room);
    const room = await repository.preload({ id, ...dto });
    if (!room) throw this.roomNotFoundException();
    const savedRoom = await repository.save(room);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.UPDATE_SUCCESS'),
      data: this.toResponse(savedRoom),
    };
  }

  async updatePrice(id: string, dto: UpdateRoomPriceDto) {
    const repository = this.dataSource.getRepository(Room);
    const room = await repository.preload({
      id,
      pricePerNight: dto.pricePerNight,
    });
    if (!room) throw this.roomNotFoundException();
    const savedRoom = await repository.save(room);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.UPDATE_PRICE_SUCCESS'),
      data: this.toResponse(savedRoom),
    };
  }

  async addAmenities(roomId: string, dto: UpdateRoomAmenitiesDto) {
    await this.dataSource.transaction(async (manager) => {
      await this.assertRoomExists(manager.getRepository(Room), roomId);
      await this.assertAmenitiesExist(manager, dto.amenityIds);

      const repository = manager.getRepository(RoomAmenity);
      const existing = await repository
        .createQueryBuilder('roomAmenity')
        .where('roomAmenity.roomId = :roomId', { roomId })
        .andWhere('roomAmenity.amenityId IN (:...amenityIds)', {
          amenityIds: dto.amenityIds,
        })
        .getMany();
      const existingIds = new Set(existing.map(({ amenityId }) => amenityId));
      const newMappings = dto.amenityIds
        .filter((amenityId) => !existingIds.has(amenityId))
        .map((amenityId) => repository.create({ roomId, amenityId }));

      if (newMappings.length > 0) await repository.save(newMappings);
    });

    return {
      statusCode: 201,
      message: this.i18n.t('messages.ROOM.AMENITIES_ADDED'),
    };
  }

  async removeAmenity(roomId: string, amenityId: string) {
    await this.assertRoomExists(this.dataSource.getRepository(Room), roomId);
    const result = await this.dataSource
      .getRepository(RoomAmenity)
      .delete({ roomId, amenityId });
    if (!result.affected) throw this.roomAmenityNotFoundException();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.AMENITY_REMOVED'),
    };
  }

  async addImage(
    roomId: string,
    file: Express.Multer.File | undefined,
    dto: AddRoomImageDto,
  ) {
    if (!file) throw this.imageFileRequiredException();

    // Kiểm tra phòng tồn tại trước khi gọi Cloudinary — tránh tốn 1 lượt
    // upload cho request nhắm vào phòng không tồn tại (cùng lý do với
    // UsersService.updateAvatar()).
    await this.assertRoomExists(this.dataSource.getRepository(Room), roomId);

    const publicId = buildRoomImagePublicId(roomId, randomUUID());
    const uploadResult = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      { public_id: publicId, resource_type: 'image' },
    );

    const savedImage = await this.dataSource.transaction(async (manager) => {
      await this.assertRoomExists(manager.getRepository(Room), roomId);
      const repository = manager.getRepository(Image);

      if (dto.isThumbnail === true) {
        await repository
          .createQueryBuilder()
          .update(Image)
          .set({ isThumbnail: false })
          .where('room_id = :roomId', { roomId })
          .andWhere('deleted_at IS NULL')
          .execute();
      }

      return repository.save(
        repository.create({
          roomId,
          imageUrl: uploadResult.secure_url,
          imagePublicId: uploadResult.public_id,
          isThumbnail: dto.isThumbnail ?? false,
        }),
      );
    });

    return {
      statusCode: 201,
      message: this.i18n.t('messages.ROOM.IMAGE_UPLOAD_SUCCESS'),
      data: plainToInstance(RoomImageResponseDto, savedImage, {
        excludeExtraneousValues: true,
      }),
    };
  }

  // Đặt 1 ảnh ĐÃ upload làm thumbnail — khác addImage()'s isThumbnail (chỉ
  // set được lúc upload), route này cho phép đổi thumbnail mà không cần
  // xoá + upload lại ảnh cũ.
  async setThumbnail(roomId: string, imageId: string) {
    await this.dataSource.transaction(async (manager) => {
      await this.assertRoomExists(manager.getRepository(Room), roomId);
      const repository = manager.getRepository(Image);
      const image = await repository.findOneBy({ id: imageId, roomId });
      if (!image) throw this.roomImageNotFoundException();

      if (image.isThumbnail) return;

      await repository
        .createQueryBuilder()
        .update(Image)
        .set({ isThumbnail: false })
        .where('room_id = :roomId', { roomId })
        .andWhere('deleted_at IS NULL')
        .execute();

      await repository.update({ id: imageId, roomId }, { isThumbnail: true });
    });

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.THUMBNAIL_SET_SUCCESS'),
    };
  }

  async removeImage(roomId: string, imageId: string) {
    await this.assertRoomExists(this.dataSource.getRepository(Room), roomId);
    const repository = this.dataSource.getRepository(Image);
    const image = await repository.findOneBy({ id: imageId, roomId });
    if (!image) throw this.roomImageNotFoundException();

    const result = await repository.softDelete({ id: imageId, roomId });
    if (!result.affected) throw this.roomImageNotFoundException();

    // Best-effort: xoá asset trên Cloudinary sau khi soft-delete DB thành
    // công. Không rollback DB nếu Cloudinary lỗi — ảnh đã ẩn khỏi ứng dụng
    // (soft-delete), rác trên Cloudinary (nếu Cloudinary lỗi) không ảnh
    // hưởng chức năng, dọn thủ công sau nếu cần.
    if (image.imagePublicId) {
      await this.cloudinaryService
        .destroy(image.imagePublicId)
        .catch(() => undefined);
    }

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.IMAGE_REMOVED'),
    };
  }

  async remove(id: string) {
    const imagePublicIds = await this.dataSource.transaction(
      async (manager) => {
        await this.assertRoomExists(manager.getRepository(Room), id);
        const imageRepository = manager.getRepository(Image);
        const images = await imageRepository.find({
          where: { roomId: id },
          select: { imagePublicId: true },
        });

        await imageRepository.softDelete({ roomId: id });
        await manager.getRepository(RoomAmenity).delete({ roomId: id });
        const result = await manager.getRepository(Room).softDelete(id);
        if (!result.affected) throw this.roomNotFoundException();

        return images
          .map((image) => image.imagePublicId)
          .filter((publicId): publicId is string => Boolean(publicId));
      },
    );

    // Dọn rác Cloudinary sau khi transaction DB đã thành công — best-effort,
    // không rollback DB nếu 1 vài asset xoá lỗi trên Cloudinary.
    await Promise.all(
      imagePublicIds.map((publicId) =>
        this.cloudinaryService.destroy(publicId).catch(() => undefined),
      ),
    );

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.REMOVE_SUCCESS'),
    };
  }

  private async assertRoomExists(
    repository: Repository<Room>,
    id: string,
  ): Promise<void> {
    if (!(await repository.existsBy({ id })))
      throw this.roomNotFoundException();
  }

  private async assertAmenitiesExist(
    manager: EntityManager,
    amenityIds: string[],
  ): Promise<void> {
    if (amenityIds.length === 0) return;
    const count = await manager.getRepository(Amenity).countBy({
      id: In(amenityIds),
    });
    if (count !== amenityIds.length) throw this.amenityNotFoundException();
  }

  private toResponse(room: Room): RoomResponseDto {
    return plainToInstance(RoomResponseDto, room, {
      excludeExtraneousValues: true,
    });
  }

  private roomNotFoundException(): NotFoundException {
    return new NotFoundException(this.i18n.t('messages.ROOM.NOT_FOUND'));
  }

  private amenityNotFoundException(): NotFoundException {
    return new NotFoundException(
      this.i18n.t('messages.ROOM.AMENITY_NOT_FOUND'),
    );
  }

  private roomAmenityNotFoundException(): NotFoundException {
    return new NotFoundException(
      this.i18n.t('messages.ROOM.ROOM_AMENITY_NOT_FOUND'),
    );
  }

  private roomImageNotFoundException(): NotFoundException {
    return new NotFoundException(this.i18n.t('messages.ROOM.IMAGE_NOT_FOUND'));
  }

  private roomNumberExistsException(): ConflictException {
    return new ConflictException(this.i18n.t('messages.ROOM.NUMBER_EXISTS'));
  }

  private imageFileRequiredException(): BadRequestException {
    return new BadRequestException(
      this.i18n.t('messages.ROOM.IMAGE_FILE_REQUIRED'),
    );
  }
}
