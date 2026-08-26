import {
  Controller,
  Get,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { StatisticsService } from './statistics.service';
import { StatisticsExportService } from './statistics-export.service';
import { STATISTICS_EXPORT } from './statistics-export.constants';

@ApiTags('Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly statisticsExportService: StatisticsExportService,
  ) {}

  @Get('revenue-bookings/export')
  @ApiOperation({
    summary: 'Export revenue and booking statistics to an Excel file',
  })
  @ApiProduces(STATISTICS_EXPORT.MIME_TYPE)
  @ApiOkResponse({
    description: 'Excel file containing the selected statistics',
    schema: { type: 'string', format: 'binary' },
  })
  async exportRevenueAndBookings(
    @Query() query: StatisticsQueryDto,
  ): Promise<StreamableFile> {
    const file = await this.statisticsExportService.exportToExcel(query);
    return new StreamableFile(file, {
      type: STATISTICS_EXPORT.MIME_TYPE,
      disposition: `attachment; filename="${this.statisticsExportService.getFileName(query)}"`,
    });
  }

  @Get('revenue-bookings')
  @ApiOperation({
    summary:
      'Get revenue and booking totals grouped by day, month, quarter, or year',
  })
  @ApiOkResponse({ type: StatisticsResponseDto })
  getRevenueAndBookings(
    @Query() query: StatisticsQueryDto,
  ): Promise<StatisticsResponseDto> {
    return this.statisticsService.getRevenueAndBookings(query);
  }
}
