/* sunlint-disable */
import {
  BadRequestException,
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
import { ListPublicRoomsDto } from './dto/list-public-rooms.dto';
import { I18nService } from 'nestjs-i18n';
import { plainToInstance } from 'class-transformer';
import { RoomResponseDto } from './dto/room-response.dto';
import { FindAvailableRoomsDto } from './dto/find-available-rooms.dto';
import { RoomStatus } from './enums/room-status.enum';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';

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
    @InjectRepository(Room)
    private readonly repo: Repository<Room>,
    private readonly i18n: I18nService,
  ) {}

  async create(createRoomDto: CreateRoomDto) {
    const existingRoom = await this.repo.findOneBy({
      roomNumber: createRoomDto.roomNumber,
    });
    if (existingRoom) {
      throw this.roomNumberExistsException();
    }
    const room = this.repo.create(createRoomDto);
    const savedRoom = await this.repo.save(room);

    return {
      statusCode: 201,
      message: this.i18n.t('messages.ROOM_CREATE_SUCCESS'),
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
      message: this.i18n.t('messages.ROOM_FIND_ALL_SUCCESS'),
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
      message: this.i18n.t('messages.ROOM_FIND_ALL_SUCCESS'),
      data,
    };
  }

  private async listRooms(
    page: number,
    limit: number,
    status?: RoomStatus,
  ): Promise<PaginatedRooms> {
    const [data, total] = await this.repo.findAndCount({
      where: status ? { status } : {},
      select: {
        id: true,
        roomNumber: true,
        name: true,
        roomType: true,
        description: true,
        viewType: true,
        pricePerNight: true,
        capacity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { id: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });

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
        this.i18n.t('messages.ROOM_INVALID_DATE_RANGE'),
      );
    }

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

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM_AVAILABLE_SUCCESS'),
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
    const room = await this.repo.findOneBy({ id });
    if (!room) throw this.roomNotFoundException();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM_FIND_ONE_SUCCESS'),
      data: this.toResponse(room),
    };
  }

  async update(id: string, updateRoomDto: UpdateRoomDto) {
    const payload: Partial<Room> = updateRoomDto;
    const room = await this.repo.preload({ id, ...payload });
    if (!room) throw this.roomNotFoundException();
    const savedRoom = await this.repo.save(room);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM_UPDATE_SUCCESS'),
      data: this.toResponse(savedRoom),
    };
  }

  async remove(id: string) {
    const result = await this.repo.softDelete(id);
    if (!result.affected) throw this.roomNotFoundException();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.ROOM_REMOVE_SUCCESS'),
    };
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
