import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { DataSource } from 'typeorm';
import { Amenity } from '../amenities/entities/amenity.entity';
import { RoomAmenity } from '../amenities/entities/room-amenity.entity';
import { Image } from '../images/entities/image.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from './entities/room.entity';
import { RoomStatus } from './enums/room-status.enum';
import { RoomViewType } from './enums/room-view-type.enum';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  const room: Room = {
    id: '1',
    roomNumber: '101',
    name: 'Deluxe Room',
    roomType: 'Deluxe',
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
    roomType: room.roomType as string,
    viewType: room.viewType ?? undefined,
    pricePerNight: room.pricePerNight,
    capacity: room.capacity,
    status: room.status,
    amenityIds: ['10', '11'],
  };

  const roomRepository = {
    create: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    preload: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    existsBy: jest.fn(),
  };
  const amenityRepository = { countBy: jest.fn() };
  const roomAmenityRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const imageRepository = {
    create: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Room) return roomRepository;
      if (entity === Amenity) return amenityRepository;
      if (entity === RoomAmenity) return roomAmenityRepository;
      if (entity === Image) return imageRepository;
      throw new TypeError('Unexpected entity');
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback: (value: typeof manager) => unknown) =>
      Promise.resolve(callback(manager)),
    ),
    getRepository: manager.getRepository,
  };
  const i18n = { t: jest.fn((key: string) => key) };
  let service: RoomsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoomsService(
      dataSource as unknown as DataSource,
      i18n as unknown as I18nService,
    );
  });

  it('creates a room and amenity mappings in one transaction', async () => {
    roomRepository.findOneBy.mockResolvedValue(null);
    amenityRepository.countBy.mockResolvedValue(2);
    roomRepository.create.mockReturnValue(room);
    roomRepository.save.mockResolvedValue(room);
    roomAmenityRepository.create.mockImplementation((value: unknown) => value);
    roomAmenityRepository.save.mockResolvedValue([]);

    await expect(service.create(createDto)).resolves.toMatchObject({ id: '1' });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(roomAmenityRepository.save).toHaveBeenCalledWith([
      { roomId: '1', amenityId: '10' },
      { roomId: '1', amenityId: '11' },
    ]);
  });

  it('rejects a duplicate room number before writing', async () => {
    roomRepository.findOneBy.mockResolvedValue(room);
    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(roomRepository.save).not.toHaveBeenCalled();
  });

  it('rejects unknown amenity IDs and rolls back the transaction', async () => {
    roomRepository.findOneBy.mockResolvedValue(null);
    amenityRepository.countBy.mockResolvedValue(1);
    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(roomRepository.save).not.toHaveBeenCalled();
  });

  it('updates only the room price', async () => {
    roomRepository.preload.mockResolvedValue({ ...room, pricePerNight: 200 });
    roomRepository.save.mockResolvedValue({ ...room, pricePerNight: 200 });
    await expect(
      service.updatePrice(room.id, { pricePerNight: 200 }),
    ).resolves.toMatchObject({ pricePerNight: 200 });
    expect(roomRepository.preload).toHaveBeenCalledWith({
      id: room.id,
      pricePerNight: 200,
    });
  });

  it('throws when a room is not found', async () => {
    roomRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('soft deletes a room', async () => {
    roomRepository.existsBy.mockResolvedValue(true);
    roomRepository.softDelete.mockResolvedValue({ affected: 1 });
    imageRepository.softDelete.mockResolvedValue({ affected: 1 });
    roomAmenityRepository.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove(room.id)).resolves.toEqual({ deleted: true });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(imageRepository.softDelete).toHaveBeenCalledWith({
      roomId: room.id,
    });
    expect(roomAmenityRepository.delete).toHaveBeenCalledWith({
      roomId: room.id,
    });
  });

  it('soft deletes an image that belongs to the room', async () => {
    roomRepository.existsBy.mockResolvedValue(true);
    imageRepository.findOneBy.mockResolvedValue({ id: '20', roomId: room.id });
    imageRepository.softDelete.mockResolvedValue({ affected: 1 });

    await expect(service.removeImage(room.id, '20')).resolves.toEqual({
      message: 'messages.ROOM.IMAGE_REMOVED',
    });
    expect(imageRepository.softDelete).toHaveBeenCalledWith({
      id: '20',
      roomId: room.id,
    });
  });

  it('does not delete an image belonging to another room', async () => {
    roomRepository.existsBy.mockResolvedValue(true);
    imageRepository.findOneBy.mockResolvedValue(null);

    await expect(service.removeImage(room.id, '20')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(imageRepository.softDelete).not.toHaveBeenCalled();
  });

  it('requires a multipart image file', async () => {
    await expect(
      service.addImage(room.id, undefined, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('stores an uploaded room image URL', async () => {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const file = {
      filename: 'room.webp',
      mimetype: 'image/webp',
      path: '/tmp/room.webp',
    } as Express.Multer.File;
    roomRepository.existsBy.mockResolvedValue(true);
    imageRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    imageRepository.create.mockImplementation((value: unknown) => value);
    imageRepository.save.mockResolvedValue({
      id: '20',
      roomId: room.id,
      imageUrl: '/uploads/rooms/room.webp',
      isThumbnail: true,
    });

    await expect(
      service.addImage(room.id, file, { isThumbnail: true }),
    ).resolves.toMatchObject({ imageUrl: '/uploads/rooms/room.webp' });
    expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
    expect(imageRepository.save).toHaveBeenCalled();
  });
});
