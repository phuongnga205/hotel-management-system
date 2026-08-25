import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { Booking } from './entities/booking.entity';
import { Room } from '../rooms/entities/room.entity';
import { MailPersistenceModule } from '../mail/mail-persistence.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Room]), MailPersistenceModule],
  controllers: [BookingsController, AdminBookingsController],
  providers: [BookingsService],
  exports: [TypeOrmModule],
})
export class BookingsModule {}
