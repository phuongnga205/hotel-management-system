import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReviewDeleteDto {

    @ApiProperty({
        description:"Lý do xóa review của admin",
        example: "Review phản cảm không đúng sự thật."
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    deleteReason!: string;
}