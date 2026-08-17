import { Test, TestingModule } from '@nestjs/testing';
import { Workbook } from 'exceljs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoomsExportService } from './rooms-export.service';
import { Room } from './entities/room.entity';

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
      { id: 1, room_number: '101', price: '1500000.00' },
      { id: 2, room_number: '102', price: '1750000.00' },
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
      'Room Number',
      'Price',
    ]);
    expect(worksheet?.getRow(2).values).toEqual([
      undefined,
      1,
      '101',
      '1500000.00',
    ]);
  });
});
