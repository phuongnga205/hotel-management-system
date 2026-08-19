
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBookingDto {
    @ApiProperty({
        description: 'The check-in date',
        example: '2023-10-01',
    })
    @IsOptional()
    @IsDateString()
    checkInDate?: string;

    @ApiProperty({
        description: 'The check-out date',
        example: '2023-10-05',
    })
    @IsOptional()
    @IsDateString()
    checkOutDate?: string;

    @ApiProperty({
        description: 'A note about the booking',
        example: 'Special requests: extra towels',
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;
}
