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

@Injectable()
export class RoomsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService,
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

  async findAll(query: ListRoomsDto) {
    const { page, limit } = query;
    const [data, total] = await this.dataSource
      .getRepository(Room)
      .findAndCount({
        order: { id: 'ASC' },
        take: limit,
        skip: (page - 1) * limit,
      });

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.FIND_ALL_SUCCESS'),
      data: {
        items: data.map((room) => this.toResponse(room)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const room = await this.dataSource.getRepository(Room).findOneBy({ id });
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
    if (
      !ROOM_IMAGE.SUPPORTED_MIME_TYPES.some((type) => type === file.mimetype)
    ) {
      await unlink(file.path);
      throw this.unsupportedImageTypeException();
    }

    let savedImage: Image;
    try {
      savedImage = await this.dataSource.transaction(async (manager) => {
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
            imageUrl: `${ROOM_IMAGE.PUBLIC_PREFIX}/${file.filename}`,
            isThumbnail: dto.isThumbnail ?? false,
          }),
        );
      });
    } catch (error: unknown) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }

    return {
      statusCode: 201,
      message: this.i18n.t('messages.ROOM.IMAGE_UPLOAD_SUCCESS'),
      data: plainToInstance(RoomImageResponseDto, savedImage, {
        excludeExtraneousValues: true,
      }),
    };
  }

  async removeImage(roomId: string, imageId: string) {
    await this.assertRoomExists(this.dataSource.getRepository(Room), roomId);
    const repository = this.dataSource.getRepository(Image);
    const image = await repository.findOneBy({ id: imageId, roomId });
    if (!image) throw this.roomImageNotFoundException();

    const result = await repository.softDelete({ id: imageId, roomId });
    if (!result.affected) throw this.roomImageNotFoundException();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM.IMAGE_REMOVED'),
    };
  }

  async remove(id: string) {
    await this.dataSource.transaction(async (manager) => {
      await this.assertRoomExists(manager.getRepository(Room), id);
      await manager.getRepository(Image).softDelete({ roomId: id });
      await manager.getRepository(RoomAmenity).delete({ roomId: id });
      const result = await manager.getRepository(Room).softDelete(id);
      if (!result.affected) throw this.roomNotFoundException();
    });

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

  private unsupportedImageTypeException(): BadRequestException {
    return new BadRequestException(
      this.i18n.t('messages.ROOM.IMAGE_TYPE_UNSUPPORTED'),
    );
  }
}
