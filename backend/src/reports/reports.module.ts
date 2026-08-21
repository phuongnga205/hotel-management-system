import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { ReportsService } from './reports.service';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, User, Payment]),
    MailModule,
  ],
  providers: [ReportsService],
})
export class ReportsModule {}
