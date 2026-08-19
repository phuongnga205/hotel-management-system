import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNumberString,
} from 'class-validator';

export class UpdateRoomAmenitiesDto {
  @ApiProperty({ example: ['1', '2'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsNumberString({}, { each: true })
  amenityIds!: string[];
}
