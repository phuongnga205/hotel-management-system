import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsInt,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateBookingDto {
    @ApiProperty({
        description: 'The ID of the room being booked',
        example: 1,
    })
    @IsInt()
    @IsPositive()
    roomId!: number;

    @ApiProperty({
        description: 'The check-in date',
        example: '2023-10-01',
    })
    @IsDateString()
    checkInDate!: string;

    @ApiProperty({
        description: 'The check-out date',
        example: '2023-10-05',
    })
    @IsDateString()
    checkOutDate!: string;

    @ApiProperty({
        description: 'A note about the booking',
        example: 'Special requests: extra towels',
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;
}