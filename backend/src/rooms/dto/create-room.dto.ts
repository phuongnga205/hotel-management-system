import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';
import { RoomStatus } from '../entities/room.entity';
import { Type } from 'class-transformer';

export class CreateRoomDto {
    @ApiProperty({
        description: 'The room number',
        example: '101',
    })
    @IsString()
    @MaxLength(50)
    roomNumber!: string;

    @ApiProperty({
        description: 'The name of the room',
        example: 'Deluxe Suite',
    })
    @IsString()
    @MaxLength(255)
    name!: string;

    @ApiProperty({
        description: 'The description of the room',
        example: 'A luxurious suite with a king-size bed and ocean view',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'The type of the room',
        example: 'Ocean View',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    viewType?: string;

    @ApiProperty({
        description: 'The capacity of the room',
        example: 2,
    })
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    capacity!: number;

    @ApiProperty({
        description: 'The price per night for the room',
        example: 150.00,
    })
    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    pricePerNight!: number;

    @ApiProperty({
        description: 'The status of the room',
        example: 'AVAILABLE',
    })
    @IsOptional()
    @IsEnum(RoomStatus)
    @MaxLength(20)
    status?: RoomStatus;
}
