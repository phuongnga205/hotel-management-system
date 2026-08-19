import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Amenity } from '../amenities/entities/amenity.entity';
import { RoomAmenity } from '../amenities/entities/room-amenity.entity';
import { Image } from '../images/entities/image.entity';
import { ROOM_PAGINATION } from './constants/room-pagination.constants';
import { AddRoomImageDto } from './dto/add-room-image.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { RoomImageResponseDto } from './dto/room-image-response.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { UpdateRoomAmenitiesDto } from './dto/update-room-amenities.dto';
import { UpdateRoomPriceDto } from './dto/update-room-price.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';
import { ROOM_IMAGE } from './constants/room-image.constants';
import { unlink } from 'node:fs/promises';
import { RoomType } from '../room-types/entities/room-type.entity';

@Injectable()
export class RoomsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<RoomResponseDto> {
    const { amenityIds = [], ...roomPayload } = createRoomDto;

    return this.dataSource.transaction(async (manager) => {
      const roomRepository = manager.getRepository(Room);
      const existingRoom = await roomRepository.findOneBy({
        roomNumber: roomPayload.roomNumber,
      });
      if (existingRoom) throw this.roomNumberExistsException();

      await this.assertAmenitiesExist(manager, amenityIds);
      await this.assertRoomTypeExists(manager, roomPayload.roomTypeId);
      const savedRoom = await roomRepository.save(
        roomRepository.create(roomPayload),
      );

      if (amenityIds.length > 0) {
        const repository = manager.getRepository(RoomAmenity);
        await repository.save(
          amenityIds.map((amenityId) =>
            repository.create({ roomId: savedRoom.id, amenityId }),
          ),
        );
      }

      return this.toResponse(savedRoom);
    });
  }

  async findAll(query: ListRoomsDto): Promise<{
    data: RoomResponseDto[];
    total: number;
    skip: number;
    take: number;
  }> {
    const take = query.take ?? ROOM_PAGINATION.DEFAULT_TAKE;
    const skip = query.skip ?? ROOM_PAGINATION.DEFAULT_SKIP;
    const [data, total] = await this.dataSource
      .getRepository(Room)
      .findAndCount({
        order: { id: 'ASC' },
        take,
        skip,
      });
    return {
      data: data.map((room) => this.toResponse(room)),
      total,
      skip,
      take,
    };
  }

  async findOne(id: string): Promise<RoomResponseDto> {
    const room = await this.dataSource.getRepository(Room).findOneBy({ id });
    if (!room) throw this.roomNotFoundException();
    return this.toResponse(room);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<RoomResponseDto> {
    const repository = this.dataSource.getRepository(Room);
    if (dto.roomTypeId) {
      await this.assertRoomTypeExists(this.dataSource.manager, dto.roomTypeId);
    }
    const room = await repository.preload({ id, ...dto });
    if (!room) throw this.roomNotFoundException();
    return this.toResponse(await repository.save(room));
  }

  async updatePrice(
    id: string,
    dto: UpdateRoomPriceDto,
  ): Promise<RoomResponseDto> {
    const repository = this.dataSource.getRepository(Room);
    const room = await repository.preload({
      id,
      pricePerNight: dto.pricePerNight,
    });
    if (!room) throw this.roomNotFoundException();
    return this.toResponse(await repository.save(room));
  }

  async addAmenities(
    roomId: string,
    dto: UpdateRoomAmenitiesDto,
  ): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
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
      return { message: this.i18n.t('messages.ROOM.AMENITIES_ADDED') };
    });
  }

  async removeAmenity(
    roomId: string,
    amenityId: string,
  ): Promise<{ message: string }> {
    await this.assertRoomExists(this.dataSource.getRepository(Room), roomId);
    const result = await this.dataSource
      .getRepository(RoomAmenity)
      .delete({ roomId, amenityId });
    if (!result.affected) throw this.roomAmenityNotFoundException();
    return { message: this.i18n.t('messages.ROOM.AMENITY_REMOVED') };
  }

  async addImage(
    roomId: string,
    file: Express.Multer.File | undefined,
    dto: AddRoomImageDto,
  ): Promise<RoomImageResponseDto> {
    if (!file) throw this.imageFileRequiredException();
    if (
      !ROOM_IMAGE.SUPPORTED_MIME_TYPES.some((type) => type === file.mimetype)
    ) {
      await unlink(file.path);
      throw this.unsupportedImageTypeException();
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
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

        const image = await repository.save(
          repository.create({
            roomId,
            imageUrl: `${ROOM_IMAGE.PUBLIC_PREFIX}/${file.filename}`,
            isThumbnail: dto.isThumbnail ?? false,
          }),
        );
        return plainToInstance(RoomImageResponseDto, image, {
          excludeExtraneousValues: true,
        });
      });
    } catch (error: unknown) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  async removeImage(
    roomId: string,
    imageId: string,
  ): Promise<{ message: string }> {
    await this.assertRoomExists(this.dataSource.getRepository(Room), roomId);
    const repository = this.dataSource.getRepository(Image);
    const image = await repository.findOneBy({ id: imageId, roomId });
    if (!image) throw this.roomImageNotFoundException();

    const result = await repository.softDelete({ id: imageId, roomId });
    if (!result.affected) throw this.roomImageNotFoundException();
    return { message: this.i18n.t('messages.ROOM.IMAGE_REMOVED') };
  }

  async remove(id: string): Promise<{ deleted: true }> {
    return this.dataSource.transaction(async (manager) => {
      await this.assertRoomExists(manager.getRepository(Room), id);
      await manager.getRepository(Image).softDelete({ roomId: id });
      await manager.getRepository(RoomAmenity).delete({ roomId: id });
      const result = await manager.getRepository(Room).softDelete(id);
      if (!result.affected) throw this.roomNotFoundException();
      return { deleted: true };
    });
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

  private async assertRoomTypeExists(
    manager: EntityManager,
    roomTypeId: string,
  ): Promise<void> {
    if (!(await manager.getRepository(RoomType).existsBy({ id: roomTypeId }))) {
      throw new NotFoundException(this.i18n.t('messages.ROOM_TYPE.NOT_FOUND'));
    }
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

  private unsupportedImageTypeException(): BadRequestException {
    return new BadRequestException(
      this.i18n.t('messages.ROOM.IMAGE_TYPE_UNSUPPORTED'),
    );
  }
}
