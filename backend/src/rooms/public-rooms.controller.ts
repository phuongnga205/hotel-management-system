import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { FindAvailableRoomsDto } from './dto/find-available-rooms.dto';
import { RoomPersistenceExceptionFilter } from './filters/room-persistence-exception.filter';

@UseFilters(RoomPersistenceExceptionFilter)
@Controller('rooms')
export class PublicRoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('available')
  getAvailableRooms(@Query() query: FindAvailableRoomsDto) {
    return this.roomsService.findAvailableRooms(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }
}
