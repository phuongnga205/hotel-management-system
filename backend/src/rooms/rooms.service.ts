/* sunlint-disable */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { I18nService } from 'nestjs-i18n';
import { plainToInstance } from 'class-transformer';
import { RoomResponseDto } from './dto/room-response.dto';
import { ROOM_PAGINATION } from './constants/room-pagination.constants';
import { FindAvailableRoomsDto } from './dto/find-available-rooms.dto';
import { RoomStatus } from './enums/room-status.enum';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly repo: Repository<Room>,
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
        pricePerNight: true,
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

  async findAvailableRooms(queryDto: FindAvailableRoomsDto) {
    const { page, limit, checkIn, checkOut, minPrice, maxPrice, amenities } =
      queryDto;

    const query = this.repo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.roomAmenities', 'roomAmenity')
      .leftJoinAndSelect('roomAmenity.amenity', 'amenity')
      .leftJoinAndSelect('room.images', 'image')
      .where('room.status = :status', { status: RoomStatus.ACTIVE });

    if (minPrice !== undefined) {
      query.andWhere('room.pricePerNight >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      query.andWhere('room.pricePerNight <= :maxPrice', { maxPrice });
    }

    if (amenities && amenities.length > 0) {
      query.andWhere('amenity.name IN (:...amenities)', { amenities });
    }

    if (checkIn && checkOut) {
      query
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
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: data.map((room) => this.toResponse(room)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<RoomResponseDto> {
    const room = await this.repo.findOneBy({ id });
    if (!room) throw this.roomNotFoundException();
    return this.toResponse(room);
  }

  async update(
    id: string,
    updateRoomDto: UpdateRoomDto,
  ): Promise<RoomResponseDto> {
    const payload: Partial<Room> = updateRoomDto;
    const room = await this.repo.preload({ id, ...payload });
    if (!room) throw this.roomNotFoundException();
    const savedRoom = await this.repo.save(room);
    return this.toResponse(savedRoom);
  }

  async remove(id: string): Promise<{ deleted: true }> {
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
