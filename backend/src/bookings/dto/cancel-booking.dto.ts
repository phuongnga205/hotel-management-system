import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CancelBookingDto {
    @ApiProperty({
        description: "Booking request cancel reason",
        example: "meeting cancelled"
    })
    @IsString()
    cancelReason?: string;
}