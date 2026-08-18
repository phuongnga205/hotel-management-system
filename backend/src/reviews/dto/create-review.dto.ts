import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  // roomId and userId are not accepted from the client — they're derived
  // server-side from the booking (roomId) and the authenticated user (userId).
  @ApiProperty({
    description: 'The ID of the completed booking being reviewed',
    example: '10',
  })
  @IsNumberString()
  bookingId!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional review comment',
    example: 'Great stay, very clean room.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
