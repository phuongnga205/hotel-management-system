import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { StatisticsExportService } from './statistics-export.service';
import { StatisticsPeriod } from './enums/statistics-period.enum';
import { STATISTICS_EXPORT } from './statistics-export.constants';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  const statisticsService = { getRevenueAndBookings: jest.fn() };
  const statisticsExportService = {
    exportToExcel: jest.fn(),
    getFileName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        { provide: StatisticsService, useValue: statisticsService },
        { provide: StatisticsExportService, useValue: statisticsExportService },
      ],
    }).compile();
    controller = module.get(StatisticsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns a downloadable Excel response for the validated query', async () => {
    const query = { period: StatisticsPeriod.YEAR, year: 2026 };
    const content = Buffer.from('excel');
    statisticsExportService.exportToExcel.mockResolvedValue(content);
    statisticsExportService.getFileName.mockReturnValue(
      'statistics-year-2026.xlsx',
    );

    const result = await controller.exportRevenueAndBookings(query);

    expect(statisticsExportService.exportToExcel).toHaveBeenCalledWith(query);
    expect(result.getHeaders()).toEqual({
      type: STATISTICS_EXPORT.MIME_TYPE,
      disposition: 'attachment; filename="statistics-year-2026.xlsx"',
      length: content.length,
    });
  });
});
