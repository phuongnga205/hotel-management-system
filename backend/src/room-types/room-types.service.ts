import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, Repository } from 'typeorm';
import { PostgresErrorCode } from '../common/enums/postgres-error-code.enum';
import { Room } from '../rooms/entities/room.entity';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { ListRoomTypesDto } from './dto/list-room-types.dto';
import { RoomTypeResponseDto } from './dto/room-type-response.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomType } from './entities/room-type.entity';
import { ROOM_TYPE } from './room-type.constants';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private readonly repository: Repository<RoomType>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateRoomTypeDto): Promise<RoomTypeResponseDto> {
    return this.saveWithConflictHandling(this.repository.create(dto));
  }

  async findAll(query: ListRoomTypesDto): Promise<{
    data: RoomTypeResponseDto[];
    total: number;
    skip: number;
    take: number;
  }> {
    const skip = query.skip ?? ROOM_TYPE.DEFAULT_SKIP;
    const take = query.take ?? ROOM_TYPE.DEFAULT_TAKE;
    const [roomTypes, total] = await this.repository.findAndCount({
      order: { id: 'ASC' },
      skip,
      take,
    });
    return {
      data: roomTypes.map((roomType) => this.toResponse(roomType)),
      total,
      skip,
      take,
    };
  }

  async findOne(id: string): Promise<RoomTypeResponseDto> {
    const roomType = await this.repository.findOneBy({ id });
    if (!roomType) throw this.notFoundException();
    return this.toResponse(roomType);
  }

  async update(
    id: string,
    dto: UpdateRoomTypeDto,
  ): Promise<RoomTypeResponseDto> {
    const roomType = await this.repository.preload({ id, ...dto });
    if (!roomType) throw this.notFoundException();
    return this.saveWithConflictHandling(roomType);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    if (!(await this.repository.existsBy({ id })))
      throw this.notFoundException();
    if ((await this.roomRepository.countBy({ roomTypeId: id })) > 0) {
      throw new ConflictException(this.i18n.t('messages.ROOM_TYPE.IN_USE'));
    }
    await this.repository.softDelete(id);
    return { deleted: true };
  }

  private async saveWithConflictHandling(
    roomType: RoomType,
  ): Promise<RoomTypeResponseDto> {
    try {
      return this.toResponse(await this.repository.save(roomType));
    } catch (error: unknown) {
      if (this.isNameConflict(error)) {
        throw new ConflictException(
          this.i18n.t('messages.ROOM_TYPE.NAME_EXISTS'),
        );
      }
      throw error;
    }
  }

  private isNameConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };
    return (
      driverError.code === PostgresErrorCode.UNIQUE_VIOLATION &&
      driverError.constraint === ROOM_TYPE.NAME_UNIQUE_CONSTRAINT
    );
  }

  private toResponse(roomType: RoomType): RoomTypeResponseDto {
    return plainToInstance(RoomTypeResponseDto, roomType, {
      excludeExtraneousValues: true,
    });
  }

  private notFoundException(): NotFoundException {
    return new NotFoundException(this.i18n.t('messages.ROOM_TYPE.NOT_FOUND'));
  }
}
