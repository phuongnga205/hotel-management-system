import { ApiProperty } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateAmenityDto {
    @ApiProperty({
        description: 'The name of the amenity',
        example: 'Free Wi-Fi',
    })
    @IsString()
    @MaxLength(100)
    name!: string;

    @ApiProperty({
        description: 'The description of the amenity',
        example: 'High-speed internet access throughout the hotel',
    })
    @IsOptional()
    @IsString()
    description?: string;
}