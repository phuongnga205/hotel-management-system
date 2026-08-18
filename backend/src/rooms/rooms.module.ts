import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { Amenity } from 'src/amenities/entities/amenity.entity';
import { RoomAmenity } from 'src/amenities/entities/room-amenity.entity';
import { Booking } from 'src/bookings/entities/booking.entity';
import { Image } from 'src/images/entities/image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room,Amenity,RoomAmenity,Image,Booking])],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
