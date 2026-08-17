import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsPositive } from "class-validator";

export class CreateRoomAmenityDto {

    @ApiProperty({
        description: 'The ID of the room',
        example: 1,
    })
    @IsInt()
    @IsPositive()
    roomId!: number;

    @ApiProperty({
        description: 'The ID of the amenity',
        example: 1,
    })
    @IsInt()
    @IsPositive()
    amenityId!: number;
}