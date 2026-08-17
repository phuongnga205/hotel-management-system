import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import type { Worksheet } from 'exceljs';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindManyOptions } from 'typeorm';
import { ROOM_EXPORT } from './constants/room-export.constants';
import { Room } from './entities/room.entity';

interface RoomExportStore {
  find(options?: FindManyOptions<Room>): Promise<Room[]>;
}

type ExcelCellValue = string | number | boolean | Date | null;

@Injectable()
export class RoomsExportService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: RoomExportStore,
  ) {}

  async exportToExcel(): Promise<Buffer> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(ROOM_EXPORT.WORKSHEET_NAME, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const columnNames = [
      'id',
      'roomNumber',
      'name',
      'description',
      'viewType',
      'price',
      'capacity',
      'status',
      'createdAt',
      'updatedAt',
    ];
    this.configureWorksheet(worksheet, columnNames);

    let offset = 0;
    while (true) {
      const rooms = await this.findRoomBatch(offset);
      if (rooms.length === 0) break;

      const rows = rooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        name: r.name ?? '',
        description: r.description ?? '',
        viewType: r.viewType ?? '',
        price: r.price ?? null,
        capacity: r.capacity ?? null,
        status: r.status,
        createdAt: r.createdAt ?? null,
        updatedAt: r.updatedAt ?? null,
      }));

      for (const row of rows) {
        const typedRow: Record<string, ExcelCellValue | null> = row;
        worksheet.addRow(
          columnNames.map((c) => this.toExcelValue(typedRow[c])),
        );
      }

      offset += rooms.length;
      if (rooms.length < ROOM_EXPORT.BATCH_SIZE) break;
    }

    const excelBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(excelBuffer);
  }

  private findRoomBatch(offset: number): Promise<Room[]> {
    return this.roomRepository.find({
      select: {
        id: true,
        roomNumber: true,
        name: true,
        description: true,
        viewType: true,
        price: true,
        capacity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { id: 'ASC' },
      skip: offset,
      take: ROOM_EXPORT.BATCH_SIZE,
    });
  }

  private configureWorksheet(
    worksheet: Worksheet,
    columnNames: string[],
  ): void {
    worksheet.columns = columnNames.map((columnName) => ({
      header: this.toColumnHeader(columnName),
      key: columnName,
      width: Math.max(this.toColumnHeader(columnName).length + 2, 15),
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnNames.length },
    };
  }

  private toColumnHeader(columnName: string): string {
    return columnName
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private toExcelValue(value: unknown): ExcelCellValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date
    ) {
      return value;
    }

    return JSON.stringify(value);
  }
}
