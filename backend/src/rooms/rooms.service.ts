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
  DeleteResult,
  FindManyOptions,
  FindOptionsWhere,
} from 'typeorm';
import { Room } from './entities/room.entity';
import { ListRoomsDto } from './dto/list-rooms.dto';

interface RoomStore {
  create(entityLike: DeepPartial<Room>): Room;
  delete(id: number): Promise<DeleteResult>;
  findAndCount(options?: FindManyOptions<Room>): Promise<[Room[], number]>;
  findOneBy(where: FindOptionsWhere<Room>): Promise<Room | null>;
  preload(entityLike: DeepPartial<Room>): Promise<Room | undefined>;
  save(entity: Room): Promise<Room>;
}

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly repo: RoomStore,
  ) {}

  async create(createRoomDto: CreateRoomDto) {
    const existingRoom = await this.repo.findOneBy({
      roomNumber: createRoomDto.roomNumber,
    });
    if (existingRoom) {
      throw new ConflictException('room.room_number_exists');
    }

    const room = this.repo.create(createRoomDto);
    return this.repo.save(room);
  }

  async findAll(query: ListRoomsDto) {
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;

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
    return { data, total };
  }

  async findOne(id: number) {
    const room = await this.repo.findOneBy({ id });
    if (!room) throw new NotFoundException('room.not_found');
    return room;
  }

  async update(id: number, updateRoomDto: UpdateRoomDto) {
    const payload: Partial<Room> = updateRoomDto;
    const room = await this.repo.preload({ id, ...payload });
    if (!room) throw new NotFoundException('room.not_found');
    return this.repo.save(room);
  }

  async remove(id: number) {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('room.not_found');
    return { deleted: true };
  }
}
