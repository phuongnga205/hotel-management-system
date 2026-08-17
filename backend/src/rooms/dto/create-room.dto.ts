import {
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateRoomDto {
    @IsString()
    @MaxLength(50)
    roomNumber!: string;

    @IsString()
    @MaxLength(255)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    viewType?: string;

    @IsInt()
    @IsPositive()
    capacity!: number;

    @IsNumber()
    @IsPositive()
    pricePerNight!: number;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    status?: string;
}