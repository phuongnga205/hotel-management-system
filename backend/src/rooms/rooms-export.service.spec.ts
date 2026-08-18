import { Test, TestingModule } from '@nestjs/testing';
import { Workbook } from 'exceljs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoomsExportService } from './rooms-export.service';
import { Room } from './entities/room.entity';
import { RoomStatus } from './enums/room-status.enum';
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
        id: '1',
        roomNumber: '101',
        name: 'Room 101',
        pricePerNight: 1500000,
        capacity: 2,
        status: RoomStatus.ACTIVE,
      },
      {
        id: '2',
        roomNumber: '102',
        name: 'Room 102',
        pricePerNight: 1750000,
        capacity: 3,
        status: RoomStatus.ACTIVE,
      },
    ]);

    const file = service.exportToExcel();
    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      const chunkValue: unknown = chunk;
      if (!(chunkValue instanceof Uint8Array)) {
        throw new TypeError('Expected the Excel stream to emit binary chunks');
      }
      chunks.push(Buffer.from(chunkValue));
    }
    const workbook = new Workbook();
    const workbookBuffer = Buffer.concat(chunks) as unknown as Parameters<
      typeof workbook.xlsx.load
    >[0];
    await workbook.xlsx.load(workbookBuffer);
    const worksheet = workbook.getWorksheet('Rooms');

    expect(worksheet).toBeDefined();
    expect(worksheet?.getRow(1).values).toEqual([
      undefined,
      'Id',
      'RoomNumber',
      'Name',
      'Description',
      'ViewType',
      'PricePerNight',
      'Capacity',
      'Status',
      'CreatedAt',
      'UpdatedAt',
    ]);
    expect(worksheet?.getRow(2).values).toEqual([
      undefined,
      '1',
      '101',
      'Room 101',
      undefined,
      undefined,
      1500000,
      2,
      'ACTIVE',
    ]);
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('exports large room lists in bounded keyset batches', async () => {
    const firstBatch = Array.from(
      { length: ROOM_EXPORT.BATCH_SIZE },
      (_, index) => ({
        id: String(index + 1),
        roomNumber: String(index + 1),
        name: `Room ${index + 1}`,
        pricePerNight: 1000000,
        capacity: 2,
        status: RoomStatus.ACTIVE,
      }),
    );
    find.mockResolvedValueOnce(firstBatch).mockResolvedValueOnce([]);

    const file = service.exportToExcel();
    for await (const chunk of file) {
      expect(chunk).toBeInstanceOf(Uint8Array);
    }

    expect(find).toHaveBeenCalledTimes(2);
    expect(find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: ROOM_EXPORT.BATCH_SIZE,
        order: { id: 'ASC' },
      }),
    );
    expect(find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: ROOM_EXPORT.BATCH_SIZE,
        order: { id: 'ASC' },
      }),
    );
  });
});
