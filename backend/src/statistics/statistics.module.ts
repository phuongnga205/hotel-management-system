import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { TokenModule } from '../token/token.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsLogger } from './statistics.logger';
import { StatisticsService } from './statistics.service';
import { StatisticsExportService } from './statistics-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment]),
    AuthModule,
    TokenModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsExportService, StatisticsLogger],
})
export class StatisticsModule {}
