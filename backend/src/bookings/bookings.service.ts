/* sunlint-disable */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { Room } from '../rooms/entities/room.entity';
import { CancelBookingDto } from './dto/cancel-booking.dto';

import type { DeepPartial, FindOneOptions, UpdateResult } from 'typeorm';

interface BookingStore {
  save(entityLike: DeepPartial<Booking>): Promise<Booking>;
  update(
    id: string,
    partialEntity: DeepPartial<Booking>,
  ): Promise<UpdateResult>;
}

interface RoomStore {
  findOne(options: FindOneOptions<Room>): Promise<Room | null>;
}

@Injectable()
export class BookingsService {
  constructor(
    // sunlint-disable-next-line C033
    @InjectRepository(Booking)
    private readonly bookingsRepository: BookingStore,
    // sunlint-disable-next-line C033
    @InjectRepository(Room) private readonly roomsRepository: RoomStore,
    private readonly i18n: I18nService,
  ) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(createBookingDto: CreateBookingDto, userId: string): never {
    throw new NotImplementedException();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findOne(id: string, userId: string): never {
    throw new NotImplementedException();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findHistory(userId: string, page: number, limit: number): never {
    throw new NotImplementedException();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: string, userId: string, updateDto: UpdateBookingDto): never {
    throw new NotImplementedException();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cancel(id: string, userId: string, reason: CancelBookingDto): never {
    throw new NotImplementedException();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remove(id: string): never {
    throw new NotImplementedException();
  }
}
