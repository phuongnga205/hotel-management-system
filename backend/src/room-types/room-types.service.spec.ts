import { ConflictException, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { RoomType } from './entities/room-type.entity';
import { RoomTypesService } from './room-types.service';

describe('RoomTypesService', () => {
  const repository = {
    create: jest.fn(),
    existsBy: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    preload: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };
  const roomRepository = { countBy: jest.fn() };
  const i18n = { t: jest.fn((key: string) => key) };
  let service: RoomTypesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoomTypesService(
      repository as unknown as Repository<RoomType>,
      roomRepository as unknown as Repository<Room>,
      i18n as unknown as I18nService,
    );
  });

  it('creates and maps a room type', async () => {
    const roomType = { id: '1', name: 'Deluxe', description: null };
    repository.create.mockReturnValue(roomType);
    repository.save.mockResolvedValue(roomType);
    await expect(service.create({ name: 'Deluxe' })).resolves.toMatchObject({
      id: '1',
      name: 'Deluxe',
    });
  });

  it('prevents deleting a room type assigned to a room', async () => {
    repository.existsBy.mockResolvedValue(true);
    roomRepository.countBy.mockResolvedValue(1);
    await expect(service.remove('1')).rejects.toBeInstanceOf(ConflictException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('returns not found for an unknown room type', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
