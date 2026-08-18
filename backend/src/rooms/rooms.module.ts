import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomAmenity } from 'src/amenities/entities/room-amenity.entity';
import { Image } from 'src/images/entities/image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room,RoomAmenity,Image])],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
