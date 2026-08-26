import { Injectable } from '@nestjs/common';
import { Workbook, type Worksheet } from 'exceljs';
import { I18nService } from 'nestjs-i18n';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { StatisticsPeriod } from './enums/statistics-period.enum';
import { STATISTICS_EXPORT } from './statistics-export.constants';
import { StatisticsService } from './statistics.service';

@Injectable()
export class StatisticsExportService {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly i18n: I18nService,
  ) {}

  async exportToExcel(query: StatisticsQueryDto): Promise<Buffer> {
    const statistics =
      await this.statisticsService.getRevenueAndBookings(query);
    const workbook = new Workbook();

    this.addSummarySheet(workbook, statistics);
    this.addBreakdownSheet(workbook, statistics);

    const content = await workbook.xlsx.writeBuffer();
    return Buffer.from(content);
  }

  getFileName(query: StatisticsQueryDto): string {
    const selectedPeriod =
      query.period === StatisticsPeriod.DAY
        ? `${query.year}-${String(query.month).padStart(2, '0')}`
        : String(query.year);
    return `statistics-${query.period.toLowerCase()}-${selectedPeriod}.xlsx`;
  }

  private addSummarySheet(
    workbook: Workbook,
    statistics: StatisticsResponseDto,
  ): void {
    const worksheet = workbook.addWorksheet(
      this.translate(STATISTICS_EXPORT.SUMMARY_SHEET_KEY),
    );
    worksheet.columns = [
      {
        header: this.translate('messages.STATISTICS.EXPORT.METRIC'),
        key: 'metric',
        width: 24,
      },
      {
        header: this.translate('messages.STATISTICS.EXPORT.VALUE'),
        key: 'value',
        width: 24,
      },
    ];
    worksheet.addRows([
      {
        metric: this.translate('messages.STATISTICS.EXPORT.PERIOD'),
        value: statistics.period,
      },
      {
        metric: this.translate('messages.STATISTICS.EXPORT.YEAR'),
        value: statistics.year,
      },
      ...(statistics.month === null
        ? []
        : [
            {
              metric: this.translate('messages.STATISTICS.EXPORT.MONTH'),
              value: statistics.month,
            },
          ]),
      {
        metric: this.translate('messages.STATISTICS.EXPORT.TOTAL_REVENUE'),
        value: statistics.totalRevenue,
      },
      {
        metric: this.translate('messages.STATISTICS.EXPORT.TOTAL_BOOKINGS'),
        value: statistics.totalBookings,
      },
    ]);
    worksheet.getColumn('value').numFmt = '#,##0.00';
    this.styleWorksheet(worksheet, 2);
  }

  private addBreakdownSheet(
    workbook: Workbook,
    statistics: StatisticsResponseDto,
  ): void {
    const worksheet = workbook.addWorksheet(
      this.translate(STATISTICS_EXPORT.BREAKDOWN_SHEET_KEY),
      { views: [{ state: 'frozen', ySplit: 1 }] },
    );
    worksheet.columns = [
      {
        header: this.translate('messages.STATISTICS.EXPORT.TIME'),
        key: 'label',
        width: 18,
      },
      {
        header: this.translate('messages.STATISTICS.EXPORT.REVENUE'),
        key: 'revenue',
        width: 20,
      },
      {
        header: this.translate('messages.STATISTICS.EXPORT.BOOKINGS'),
        key: 'bookingCount',
        width: 16,
      },
    ];
    worksheet.addRows(
      statistics.buckets.map((bucket) => ({
        label: bucket.label,
        revenue: bucket.revenue,
        bookingCount: bucket.bookingCount,
      })),
    );
    worksheet.getColumn('revenue').numFmt = '#,##0.00';
    this.styleWorksheet(worksheet, 3);
  }

  private styleWorksheet(worksheet: Worksheet, columnCount: number): void {
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF172554' },
    };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnCount },
    };
  }

  private translate(key: string): string {
    return String(this.i18n.t(key));
  }
}
