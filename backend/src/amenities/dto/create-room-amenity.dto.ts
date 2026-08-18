import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class CreateRoomAmenityDto {
  @ApiProperty({
    description: 'The ID of the room',
    example: '1',
  })
  @IsNumberString()
  roomId!: string;

  @ApiProperty({
    description: 'The ID of the amenity',
    example: '1',
  })
  @IsNumberString()
  amenityId!: string;
}
