import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNumberString,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateRoomAmenitiesDto {
  @ApiProperty({ example: ['1', '2'], type: [String] })
  @IsArray({ message: i18nValidationMessage('messages.VALIDATION.IS_ARRAY') })
  @ArrayNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.ARRAY_NOT_EMPTY'),
  })
  @ArrayUnique({
    message: i18nValidationMessage('messages.VALIDATION.ARRAY_UNIQUE'),
  })
  @IsNumberString(
    {},
    {
      each: true,
      message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING'),
    },
  )
  amenityIds!: string[];
}
