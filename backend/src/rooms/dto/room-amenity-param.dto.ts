import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RoomAmenityParamDto {
  @ApiProperty({ example: '1', description: 'ID phòng' })
  @IsNumberString(
    { no_symbols: true },
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING') },
  )
  id!: string;

  @ApiProperty({ example: '1', description: 'ID tiện nghi' })
  @IsNumberString(
    { no_symbols: true },
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING') },
  )
  amenityId!: string;
}
