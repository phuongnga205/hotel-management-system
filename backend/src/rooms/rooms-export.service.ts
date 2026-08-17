import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import type { Worksheet } from 'exceljs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ROOM_EXPORT } from './constants/room-export.constants';
import { Room } from './entities/room.entity';

type ExcelCellValue = string | number | boolean | Date | null;

@Injectable()
export class RoomsExportService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async exportToExcel(): Promise<Buffer> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(ROOM_EXPORT.WORKSHEET_NAME, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    let offset = 0;
    let columnNames: string[] = [];

    while (true) {
      const rooms = await this.findRoomBatch(offset);

      if (rooms.length === 0) {
        break;
      }

      if (columnNames.length === 0) {
        columnNames = Object.keys(rooms[0]);
        this.configureWorksheet(worksheet, columnNames);
      }

      for (const room of rooms) {
        worksheet.addRow(
          columnNames.map((columnName) => this.toExcelValue(room[columnName])),
        );
      }

      offset += rooms.length;

      if (rooms.length < ROOM_EXPORT.BATCH_SIZE) {
        break;
      }
    }

    const excelBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(excelBuffer);
  }

  private findRoomBatch(offset: number): Promise<Room[]> {
    return this.roomRepository.find({
      skip: offset,
      take: ROOM_EXPORT.BATCH_SIZE,
      order: { id: 'ASC' },
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
