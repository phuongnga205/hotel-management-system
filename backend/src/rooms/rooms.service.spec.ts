import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';
import { I18nService } from 'nestjs-i18n';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoomStatus } from './enums/room-status.enum';
import { RoomViewType } from './enums/room-view-type.enum';
import { CreateRoomDto } from './dto/create-room.dto';

describe('RoomsService', () => {
  let service: RoomsService;
  const create = jest.fn();
  const findAndCount = jest.fn();
  const findOneBy = jest.fn();
  const preload = jest.fn();
  const save = jest.fn();
  const softDelete = jest.fn();

  const room: Room = {
    id: '1',
    roomNumber: '101',
    name: 'Deluxe Room',
    roomType: null,
    description: null,
    viewType: RoomViewType.SEA_VIEW,
    pricePerNight: 1500000,
    capacity: 2,
    status: RoomStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const createDto: CreateRoomDto = {
    roomNumber: room.roomNumber,
    name: room.name,
    description: room.description ?? undefined,
    viewType: room.viewType ?? undefined,
    pricePerNight: room.pricePerNight,
    capacity: room.capacity,
    status: room.status,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: getRepositoryToken(Room),
          useValue: {
            create,
            findAndCount,
            findOneBy,
            preload,
            save,
            softDelete,
          },
        },
        {
          provide: I18nService,
          useValue: { t: (key: string) => key },
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates and maps a room response', async () => {
    findOneBy.mockResolvedValue(null);
    create.mockReturnValue(room);
    save.mockResolvedValue(room);

    await expect(service.create(createDto)).resolves.toMatchObject({
      id: room.id,
      roomNumber: room.roomNumber,
    });
    expect(save).toHaveBeenCalledWith(room);
  });

  it('rejects a duplicate room number', async () => {
    findOneBy.mockResolvedValue(room);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('throws when a room is not found', async () => {
    findOneBy.mockResolvedValue(null);

    await expect(service.findOne('999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('soft deletes a room', async () => {
    softDelete.mockResolvedValue({ affected: 1 });

    await expect(service.remove(room.id)).resolves.toEqual({ deleted: true });
    expect(softDelete).toHaveBeenCalledWith(room.id);
  });
});
