import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { StatisticsPeriod } from '../enums/statistics-period.enum';

export class StatisticsBucketResponseDto {
  @ApiProperty({ example: '2026-08' })
  @Expose()
  label!: string;

  @ApiProperty({ example: '12500000.00' })
  @Expose()
  revenue!: string;

  @ApiProperty({ example: 24 })
  @Expose()
  bookingCount!: number;
}

export class StatisticsResponseDto {
  @ApiProperty({ enum: StatisticsPeriod })
  @Expose()
  period!: StatisticsPeriod;

  @ApiProperty({ example: 2026 })
  @Expose()
  year!: number;

  @ApiProperty({ example: 8, nullable: true })
  @Expose()
  month!: number | null;

  @ApiProperty({ example: '12500000.00' })
  @Expose()
  totalRevenue!: string;

  @ApiProperty({ example: 24 })
  @Expose()
  totalBookings!: number;

  @ApiProperty({ type: [StatisticsBucketResponseDto] })
  @Expose()
  @Type(() => StatisticsBucketResponseDto)
  buckets!: StatisticsBucketResponseDto[];

  @ApiProperty({ example: false })
  @Expose()
  isCached!: boolean;
}
