import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  DeepPartial,
  FindManyOptions,
  FindOptionsWhere,
  UpdateResult,
} from 'typeorm';
import { Room } from './entities/room.entity';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { I18nService } from 'nestjs-i18n';
import { plainToInstance } from 'class-transformer';
import { RoomResponseDto } from './dto/room-response.dto';
import { ROOM_PAGINATION } from './constants/room-pagination.constants';

interface RoomStore {
  create(entityLike: DeepPartial<Room>): Room;
  findAndCount(options?: FindManyOptions<Room>): Promise<[Room[], number]>;
  findOneBy(where: FindOptionsWhere<Room>): Promise<Room | null>;
  preload(entityLike: DeepPartial<Room>): Promise<Room | undefined>;
  save(entity: Room): Promise<Room>;
  softDelete(id: number): Promise<UpdateResult>;
}

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly repo: RoomStore,
    private readonly i18n: I18nService,
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<RoomResponseDto> {
    const existingRoom = await this.repo.findOneBy({
      roomNumber: createRoomDto.roomNumber,
    });
    if (existingRoom) {
      throw this.roomNumberExistsException();
    }

    const room = this.repo.create(createRoomDto);
    const savedRoom = await this.repo.save(room);
    return this.toResponse(savedRoom);
  }

  async findAll(query: ListRoomsDto): Promise<{
    data: RoomResponseDto[];
    total: number;
    skip: number;
    take: number;
  }> {
    const take = query.take ?? ROOM_PAGINATION.DEFAULT_TAKE;
    const skip = query.skip ?? ROOM_PAGINATION.DEFAULT_SKIP;

    const [data, total] = await this.repo.findAndCount({
      select: {
        id: true,
        roomNumber: true,
        name: true,
        description: true,
        viewType: true,
        price: true,
        capacity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
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

  async findOne(id: number): Promise<RoomResponseDto> {
    const room = await this.repo.findOneBy({ id });
    if (!room) throw this.roomNotFoundException();
    return this.toResponse(room);
  }

  async update(
    id: number,
    updateRoomDto: UpdateRoomDto,
  ): Promise<RoomResponseDto> {
    const payload: Partial<Room> = updateRoomDto;
    const room = await this.repo.preload({ id, ...payload });
    if (!room) throw this.roomNotFoundException();
    const savedRoom = await this.repo.save(room);
    return this.toResponse(savedRoom);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const result = await this.repo.softDelete(id);
    if (!result.affected) throw this.roomNotFoundException();
    return { deleted: true };
  }

  private toResponse(room: Room): RoomResponseDto {
    return plainToInstance(RoomResponseDto, room, {
      excludeExtraneousValues: true,
    });
  }

  private roomNotFoundException(): NotFoundException {
    return new NotFoundException(this.i18n.t('messages.ROOM_NOT_FOUND'));
  }

  private roomNumberExistsException(): ConflictException {
    return new ConflictException(this.i18n.t('messages.ROOM_NUMBER_EXISTS'));
  }
}
