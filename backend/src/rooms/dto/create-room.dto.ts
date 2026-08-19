import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  IsNumberString,
} from 'class-validator';
import { RoomStatus } from '../enums/room-status.enum';
import { Type } from 'class-transformer';
import { RoomViewType } from '../enums/room-view-type.enum';

export class CreateRoomDto {
  @ApiProperty({
    description: 'The room number',
    example: '101',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  roomNumber!: string;

  @ApiProperty({
    description: 'The name of the room',
    example: 'Deluxe Suite',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ description: 'Room type ID', example: '1' })
  @IsNumberString({ no_symbols: true })
  roomTypeId!: string;

  @ApiProperty({
    description: 'The description of the room',
    example: 'A luxurious suite with a king-size bed and ocean view',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The type of the room',
    example: 'SEA_VIEW',
  })
  @IsOptional()
  @IsEnum(RoomViewType)
  viewType?: RoomViewType;

  @ApiProperty({
    description: 'The capacity of the room',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @IsPositive()
  capacity!: number;

  @ApiProperty({
    description: 'The price per night for the room',
    example: 150.0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  pricePerNight!: number;

  @ApiProperty({
    description: 'The status of the room',
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiProperty({
    description: 'Amenity IDs assigned when the room is created',
    example: ['1', '2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsNumberString({}, { each: true })
  amenityIds?: string[];
}
