import { PartialType } from '@nestjs/swagger';
import { CreateRoomAmenityDto } from './create-room-amenity.dto';

export class UpdateRoomAmenityDto extends PartialType(CreateRoomAmenityDto) {}
