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
import { CloudinaryService } from '../cloudinary/cloudinary.service';
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
    description: room.description ?? undefined,
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
    findOne: jest.fn(),
    preload: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    existsBy: jest.fn(),
    createQueryBuilder: jest.fn(),
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
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
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
  const cloudinaryService = {
    uploadBuffer: jest.fn(),
    destroy: jest.fn(),
  };
  let service: RoomsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoomsService(
      dataSource as unknown as DataSource,
      i18n as unknown as I18nService,
      cloudinaryService as unknown as CloudinaryService,
    );
  });

  it('creates a room and amenity mappings in one transaction', async () => {
    roomRepository.findOneBy.mockResolvedValue(null);
    amenityRepository.countBy.mockResolvedValue(2);
    roomRepository.create.mockReturnValue(room);
    roomRepository.save.mockResolvedValue(room);
    roomAmenityRepository.create.mockImplementation((value: unknown) => value);
    roomAmenityRepository.save.mockResolvedValue([]);

    await expect(service.create(createDto)).resolves.toMatchObject({
      statusCode: 201,
      data: { id: '1', roomType: room.roomType },
    });
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
    ).resolves.toMatchObject({ data: { pricePerNight: 200 } });
    expect(roomRepository.preload).toHaveBeenCalledWith({
      id: room.id,
      pricePerNight: 200,
    });
  });

  it('throws when a room is not found', async () => {
    roomRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne('999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findOne without a status arg (admin) does not filter by status', async () => {
    roomRepository.findOne.mockResolvedValue(room);
    await service.findOne(room.id);
    expect(roomRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: room.id } }),
    );
  });

  // PublicRoomsController phải truyền RoomStatus.ACTIVE — nếu không, 1
  // phòng INACTIVE/MAINTENANCE vẫn xem được qua GET /rooms/:id dù đã bị
  // ẩn khỏi GET /rooms (list), phá vỡ cam kết public chỉ thấy phòng ACTIVE.
  it('findOne with a status arg (public) 404s a room in a different status', async () => {
    roomRepository.findOne.mockResolvedValue(null);
    await expect(
      service.findOne(room.id, RoomStatus.ACTIVE),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(roomRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: room.id, status: RoomStatus.ACTIVE },
      }),
    );
  });

  it('soft deletes a room and best-effort cleans up its Cloudinary images', async () => {
    roomRepository.existsBy.mockResolvedValue(true);
    roomRepository.softDelete.mockResolvedValue({ affected: 1 });
    imageRepository.find.mockResolvedValue([
      { imagePublicId: 'rooms/room-1/a' },
      { imagePublicId: 'rooms/room-1/b' },
      { imagePublicId: null },
    ]);
    imageRepository.softDelete.mockResolvedValue({ affected: 1 });
    roomAmenityRepository.delete.mockResolvedValue({ affected: 1 });
    cloudinaryService.destroy.mockResolvedValue(undefined);

    await expect(service.remove(room.id)).resolves.toEqual({
      statusCode: 200,
      message: 'messages.ROOM.REMOVE_SUCCESS',
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(imageRepository.softDelete).toHaveBeenCalledWith({
      roomId: room.id,
    });
    expect(roomAmenityRepository.delete).toHaveBeenCalledWith({
      roomId: room.id,
    });
    expect(cloudinaryService.destroy).toHaveBeenCalledTimes(2);
    expect(cloudinaryService.destroy).toHaveBeenCalledWith('rooms/room-1/a');
    expect(cloudinaryService.destroy).toHaveBeenCalledWith('rooms/room-1/b');
  });

  it('soft deletes an image that belongs to the room and destroys its Cloudinary asset', async () => {
    roomRepository.existsBy.mockResolvedValue(true);
    imageRepository.findOneBy.mockResolvedValue({
      id: '20',
      roomId: room.id,
      imagePublicId: 'rooms/room-1/20',
    });
    imageRepository.softDelete.mockResolvedValue({ affected: 1 });
    cloudinaryService.destroy.mockResolvedValue(undefined);

    await expect(service.removeImage(room.id, '20')).resolves.toEqual({
      statusCode: 200,
      message: 'messages.ROOM.IMAGE_REMOVED',
    });
    expect(imageRepository.softDelete).toHaveBeenCalledWith({
      id: '20',
      roomId: room.id,
    });
    expect(cloudinaryService.destroy).toHaveBeenCalledWith('rooms/room-1/20');
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
    expect(cloudinaryService.uploadBuffer).not.toHaveBeenCalled();
  });

  it('404s an upload aimed at a room that does not exist, without calling Cloudinary', async () => {
    roomRepository.existsBy.mockResolvedValue(false);
    const file = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(service.addImage(room.id, file, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cloudinaryService.uploadBuffer).not.toHaveBeenCalled();
  });

  it('uploads to Cloudinary and stores the returned URL + public_id', async () => {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const file = {
      buffer: Buffer.from([0x52, 0x49, 0x46, 0x46]),
      mimetype: 'image/webp',
    } as Express.Multer.File;
    roomRepository.existsBy.mockResolvedValue(true);
    cloudinaryService.uploadBuffer.mockResolvedValue({
      secure_url:
        'https://res.cloudinary.com/demo/image/upload/v1/rooms/room-1/abc.webp',
      public_id: 'rooms/room-1/abc',
    });
    imageRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    imageRepository.create.mockImplementation((value: unknown) => value);
    imageRepository.save.mockResolvedValue({
      id: '20',
      roomId: room.id,
      imageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/rooms/room-1/abc.webp',
      imagePublicId: 'rooms/room-1/abc',
      isThumbnail: true,
    });

    await expect(
      service.addImage(room.id, file, { isThumbnail: true }),
    ).resolves.toMatchObject({
      statusCode: 201,
      data: {
        imageUrl:
          'https://res.cloudinary.com/demo/image/upload/v1/rooms/room-1/abc.webp',
      },
    });
    expect(cloudinaryService.uploadBuffer).toHaveBeenCalledWith(
      file.buffer,
      expect.objectContaining({ resource_type: 'image' }),
    );
    // Ảnh mới isThumbnail:true PHẢI lật mọi ảnh khác của phòng về false
    // trước — không được có 2 ảnh cùng isThumbnail:true trong 1 phòng.
    expect(queryBuilder.set).toHaveBeenCalledWith({ isThumbnail: false });
    expect(queryBuilder.where).toHaveBeenCalledWith('room_id = :roomId', {
      roomId: room.id,
    });
    expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
    expect(imageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ imagePublicId: 'rooms/room-1/abc' }),
    );
  });

  it('does not touch other images when uploading a non-thumbnail image', async () => {
    const file = {
      buffer: Buffer.from([0x52, 0x49, 0x46, 0x46]),
      mimetype: 'image/webp',
    } as Express.Multer.File;
    roomRepository.existsBy.mockResolvedValue(true);
    cloudinaryService.uploadBuffer.mockResolvedValue({
      secure_url:
        'https://res.cloudinary.com/demo/image/upload/v1/rooms/room-1/x.webp',
      public_id: 'rooms/room-1/x',
    });
    imageRepository.create.mockImplementation((value: unknown) => value);
    imageRepository.save.mockResolvedValue({
      id: '21',
      roomId: room.id,
      imageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/rooms/room-1/x.webp',
      isThumbnail: false,
    });

    await expect(service.addImage(room.id, file, {})).resolves.toMatchObject({
      statusCode: 201,
    });
    expect(imageRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('sets an already-uploaded image as the thumbnail, flipping the room’s previous thumbnail off', async () => {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    roomRepository.existsBy.mockResolvedValue(true);
    imageRepository.findOneBy.mockResolvedValue({
      id: '20',
      roomId: room.id,
      isThumbnail: false,
    });
    imageRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    imageRepository.update.mockResolvedValue({ affected: 1 });

    await expect(service.setThumbnail(room.id, '20')).resolves.toEqual({
      statusCode: 200,
      message: 'messages.ROOM.THUMBNAIL_SET_SUCCESS',
    });
    // Phải lật MỌI ảnh khác của phòng về false trước khi set ảnh này true —
    // không được có 2 ảnh cùng isThumbnail:true trong 1 phòng.
    expect(queryBuilder.set).toHaveBeenCalledWith({ isThumbnail: false });
    expect(queryBuilder.where).toHaveBeenCalledWith('room_id = :roomId', {
      roomId: room.id,
    });
    expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
    expect(imageRepository.update).toHaveBeenCalledWith(
      { id: '20', roomId: room.id },
      { isThumbnail: true },
    );
  });

  it('is a no-op when the image is already the thumbnail (does not touch other rows)', async () => {
    roomRepository.existsBy.mockResolvedValue(true);
    imageRepository.findOneBy.mockResolvedValue({
      id: '20',
      roomId: room.id,
      isThumbnail: true,
    });

    await expect(service.setThumbnail(room.id, '20')).resolves.toEqual({
      statusCode: 200,
      message: 'messages.ROOM.THUMBNAIL_SET_SUCCESS',
    });
    expect(imageRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(imageRepository.update).not.toHaveBeenCalled();
  });

  it('404s setting a thumbnail on an image that does not belong to the room', async () => {
    roomRepository.existsBy.mockResolvedValue(true);
    imageRepository.findOneBy.mockResolvedValue(null);

    await expect(service.setThumbnail(room.id, '20')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(imageRepository.update).not.toHaveBeenCalled();
  });

  // listRooms() (findAll/findPublicList) chạy 2 bước: 1) findAndCount() chỉ
  // lấy `id` để phân trang không JOIN (tránh COUNT/LIMIT bị nhân bản dòng
  // bởi quan hệ 1-N roomAmenities), 2) QueryBuilder nạp đủ quan hệ cho đúng
  // các id đó. Mock cả 2 bước.
  function mockRoomListQueryBuilder(rooms: Room[]) {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rooms),
    };
    roomRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    return queryBuilder;
  }

  it('findAll (admin) returns every status with page/limit pagination', async () => {
    roomRepository.findAndCount.mockResolvedValue([[{ id: room.id }], 1]);
    mockRoomListQueryBuilder([room]);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(roomRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, take: 10, skip: 0 }),
    );
    expect(result).toMatchObject({
      statusCode: 200,
      data: {
        items: [expect.objectContaining({ id: room.id })],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });
  });

  it('findAll (admin) applies an optional status filter', async () => {
    roomRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({
      page: 1,
      limit: 10,
      status: RoomStatus.MAINTENANCE,
    });

    expect(roomRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: RoomStatus.MAINTENANCE } }),
    );
    expect(roomRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('findPublicList (public) always forces status=ACTIVE', async () => {
    roomRepository.findAndCount.mockResolvedValue([[{ id: room.id }], 1]);
    mockRoomListQueryBuilder([room]);

    await service.findPublicList({ page: 1, limit: 10 });

    expect(roomRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: RoomStatus.ACTIVE } }),
    );
  });

  it('findAvailableRooms rejects checkOut <= checkIn', async () => {
    await expect(
      service.findAvailableRooms({
        page: 1,
        limit: 10,
        checkIn: '2026-09-05',
        checkOut: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(roomRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
