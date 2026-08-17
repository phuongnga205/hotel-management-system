import {
    IsDateString,
    IsInt,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateBookingDto {
    @IsInt()
    @IsPositive()
    roomId!: number;

    @IsDateString()
    checkInDate!: string;

    @IsDateString()
    checkOutDate!: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;
}