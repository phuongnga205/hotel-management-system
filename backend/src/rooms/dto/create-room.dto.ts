import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';
import { RoomStatus } from '../entities/room.entity';
import { Type } from 'class-transformer';
import { RoomViewType } from '../enums/room-view-type.enum';

export class CreateRoomDto {
    @ApiProperty({
        description: 'The room number',
        example: '101',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    roomNumber!: string;

    @ApiProperty({
        description: 'The name of the room',
        example: 'Deluxe Suite',
    })
    @IsString()
    @IsNotEmpty()
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
        example: 'SEA_VIEW',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
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
        example: 150.00,
    })
    @Type(() => Number)
    @IsString()
    @IsNotEmpty()
    @IsPositive()
    pricePerNight!: string;

    @ApiProperty({
        description: 'The status of the room',
        example: 'AVAILABLE',
    })
    @IsOptional()
    @IsEnum(RoomStatus)
    @MaxLength(20)
    status?: RoomStatus;
}
