import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { Booking } from './entities/booking.entity';
import { Room } from '../rooms/entities/room.entity';
import { DomainEventsModule } from '../common/events/domain-events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Room]), DomainEventsModule],
  controllers: [BookingsController, AdminBookingsController],
  providers: [BookingsService],
  exports: [TypeOrmModule],
})
export class BookingsModule {}
