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
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateReviewDto {
  // roomId and userId are not accepted from the client — they're derived
  // server-side from the booking (roomId) and the authenticated user (userId).
  @ApiProperty({
    description: 'The ID of the completed booking being reviewed',
    example: '10',
  })
  @IsNumberString(
    { no_symbols: true },
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING') },
  )
  bookingId!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    example: 5,
  })
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  @Max(5, { message: i18nValidationMessage('messages.VALIDATION.MAX') })
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional review comment',
    example: 'Great stay, very clean room.',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(2000, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  comment?: string;
}
