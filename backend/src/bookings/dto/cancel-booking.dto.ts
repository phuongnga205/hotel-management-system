import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CancelBookingDto {
    @ApiProperty({
        description: "Booking request cancel reason",
        example: "meeting cancelled"
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    cancelReason?: string;
}