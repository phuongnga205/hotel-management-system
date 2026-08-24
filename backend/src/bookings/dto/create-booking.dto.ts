import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsDateOnly } from '../../common/validators/is-date-only.validator';
import { BOOKING_NOTE_MAX_LENGTH } from '../constants/booking.constants';

export class CreateBookingDto {
  @ApiProperty({
    description: 'The ID of the room being booked',
    example: '5',
  })
  @IsNumberString()
  roomId!: string;

  @ApiProperty({
    description: 'The check-in date (YYYY-MM-DD, no time/timezone part)',
    example: '2023-10-01',
  })
  @IsDateOnly({
    message: i18nValidationMessage('messages.VALIDATION.IS_DATE_STRING'),
  })
  checkInDate!: string;

  @ApiProperty({
    description: 'The check-out date (YYYY-MM-DD, no time/timezone part)',
    example: '2023-10-05',
  })
  @IsDateOnly({
    message: i18nValidationMessage('messages.VALIDATION.IS_DATE_STRING'),
  })
  checkOutDate!: string;

  @ApiProperty({
    description: 'Number of guests staying (must not exceed room.capacity)',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  guests!: number;

  @ApiProperty({
    description: 'A note about the booking',
    example: 'Special requests: extra towels',
  })
  @IsOptional()
  @IsString()
  @MaxLength(BOOKING_NOTE_MAX_LENGTH)
  note?: string;
}
