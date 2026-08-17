import {
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateAmenityDto {
    @IsString()
    @MaxLength(100)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;
}