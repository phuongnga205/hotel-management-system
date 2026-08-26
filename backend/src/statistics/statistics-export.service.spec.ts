import { Workbook } from 'exceljs';
import { StatisticsPeriod } from './enums/statistics-period.enum';
import { StatisticsExportService } from './statistics-export.service';
import { StatisticsService } from './statistics.service';
import { I18nService } from 'nestjs-i18n';

describe('StatisticsExportService', () => {
  const statisticsService = {
    getRevenueAndBookings: jest.fn(),
  };
  const service = new StatisticsExportService(
    statisticsService as unknown as StatisticsService,
    {
      t: jest.fn((key: string) => {
        const translations: Record<string, string> = {
          'messages.STATISTICS.EXPORT.SUMMARY_SHEET': 'Summary',
          'messages.STATISTICS.EXPORT.BREAKDOWN_SHEET': 'Breakdown',
        };
        return translations[key] ?? key;
      }),
    } as unknown as I18nService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('exports summary and breakdown sheets for the selected query', async () => {
    statisticsService.getRevenueAndBookings.mockResolvedValue({
      period: StatisticsPeriod.DAY,
      year: 2026,
      month: 8,
      totalRevenue: '3500000.00',
      totalBookings: 3,
      buckets: [
        { label: '2026-08-01', revenue: '1500000.00', bookingCount: 1 },
        { label: '2026-08-02', revenue: '2000000.00', bookingCount: 2 },
      ],
      isCached: false,
    });

    const buffer = await service.exportToExcel({
      period: StatisticsPeriod.DAY,
      year: 2026,
      month: 8,
    });
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.getWorksheet('Summary')?.getCell('B6').value).toBe(3);
    expect(workbook.getWorksheet('Breakdown')?.getCell('A2').value).toBe(
      '2026-08-01',
    );
    expect(workbook.getWorksheet('Breakdown')?.getCell('B3').value).toBe(
      '2000000.00',
    );
    expect(statisticsService.getRevenueAndBookings).toHaveBeenCalledWith({
      period: StatisticsPeriod.DAY,
      year: 2026,
      month: 8,
    });
  });

  it('builds a deterministic filename from the selected period', () => {
    expect(
      service.getFileName({
        period: StatisticsPeriod.DAY,
        year: 2026,
        month: 8,
      }),
    ).toBe('statistics-day-2026-08.xlsx');
    expect(
      service.getFileName({ period: StatisticsPeriod.QUARTER, year: 2026 }),
    ).toBe('statistics-quarter-2026.xlsx');
    expect(
      service.getFileName({ period: StatisticsPeriod.YEAR, year: 2026 }),
    ).toBe('statistics-year-2026.xlsx');
  });
});
