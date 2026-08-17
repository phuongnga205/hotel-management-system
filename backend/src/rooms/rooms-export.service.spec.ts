import { Test, TestingModule } from '@nestjs/testing';
import { Workbook } from 'exceljs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoomsExportService } from './rooms-export.service';
import { Room } from './entities/room.entity';
import { ROOM_EXPORT } from './constants/room-export.constants';

describe('RoomsExportService', () => {
  let service: RoomsExportService;
  const find = jest.fn();

  beforeEach(async () => {
    find.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsExportService,
        {
          provide: getRepositoryToken(Room),
          useValue: {
            find,
          },
        },
      ],
    }).compile();

    service = module.get<RoomsExportService>(RoomsExportService);
  });

  it('should export room records to a valid Excel workbook', async () => {
    find.mockResolvedValueOnce([
      {
        id: 1,
        roomNumber: '101',
        name: 'Room 101',
        price: 1500000,
        capacity: 2,
        status: 'AVAILABLE',
      },
      {
        id: 2,
        roomNumber: '102',
        name: 'Room 102',
        price: 1750000,
        capacity: 3,
        status: 'AVAILABLE',
      },
    ]);

    const file = await service.exportToExcel();
    const workbook = new Workbook();
    const arrayBuffer = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength,
    ) as ArrayBuffer;
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet('Rooms');

    expect(worksheet).toBeDefined();
    expect(worksheet?.getRow(1).values).toEqual([
      undefined,
      'Id',
      'RoomNumber',
      'Name',
      'Description',
      'ViewType',
      'Price',
      'Capacity',
      'Status',
      'CreatedAt',
      'UpdatedAt',
    ]);
    expect(worksheet?.getRow(2).values).toEqual([
      undefined,
      1,
      '101',
      'Room 101',
      '',
      '',
      1500000,
      2,
      'AVAILABLE',
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: ROOM_EXPORT.BATCH_SIZE }),
    );
  });
});
