import { Injectable } from '@nestjs/common';
import { stream as excelStream } from 'exceljs';
import type { Row, Worksheet } from 'exceljs';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan } from 'typeorm';
import type { FindManyOptions } from 'typeorm';
import { PassThrough } from 'stream';
import { ROOM_EXPORT } from './constants/room-export.constants';
import { Room } from './entities/room.entity';

interface RoomExportStore {
  find(options?: FindManyOptions<Room>): Promise<Room[]>;
}

type ExcelCellValue = string | number | boolean | Date | null;

function finalizeRow(row: Row): void {
  row.commit();
}

function finalizeWorksheet(worksheet: Worksheet): void {
  worksheet.commit();
}

function finalizeWorkbook(
  workbook: excelStream.xlsx.WorkbookWriter,
): Promise<void> {
  return workbook.commit();
}

@Injectable()
export class RoomsExportService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: RoomExportStore,
  ) {}

  exportToExcel(): PassThrough {
    const output = new PassThrough();
    void this.writeWorkbook(output).catch((error: unknown) => {
      output.destroy(error instanceof Error ? error : new Error(String(error)));
    });
    return output;
  }

  private async writeWorkbook(output: PassThrough): Promise<void> {
    const workbook = new excelStream.xlsx.WorkbookWriter({
      stream: output,
      useStyles: true,
    });
    const worksheet = workbook.addWorksheet(ROOM_EXPORT.WORKSHEET_NAME, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const columnNames = [
      'id',
      'roomNumber',
      'name',
      'description',
      'viewType',
      'pricePerNight',
      'capacity',
      'status',
      'createdAt',
      'updatedAt',
    ];
    this.configureWorksheet(worksheet, columnNames);

    let lastId = '0';
    while (true) {
      const rooms = await this.findRoomBatch(lastId);
      if (rooms.length === 0) break;

      const rows = rooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        name: r.name ?? '',
        description: r.description ?? '',
        viewType: r.viewType ?? '',
        pricePerNight: r.pricePerNight ?? null,
        capacity: r.capacity ?? null,
        status: r.status,
        createdAt: r.createdAt ?? null,
        updatedAt: r.updatedAt ?? null,
      }));

      for (const row of rows) {
        const typedRow: Record<string, ExcelCellValue | null> = row;
        finalizeRow(
          worksheet.addRow(
            columnNames.map((c) => this.toExcelValue(typedRow[c])),
          ),
        );
      }

      lastId = rooms[rooms.length - 1].id;
      if (rooms.length < ROOM_EXPORT.BATCH_SIZE) break;
    }

    finalizeWorksheet(worksheet);
    await finalizeWorkbook(workbook);
  }

  private findRoomBatch(lastId: string): Promise<Room[]> {
    return this.roomRepository.find({
      select: {
        id: true,
        roomNumber: true,
        name: true,
        description: true,
        viewType: true,
        pricePerNight: true,
        capacity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      where: { id: MoreThan(lastId) },
      order: { id: 'ASC' },
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
    finalizeRow(headerRow);
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
