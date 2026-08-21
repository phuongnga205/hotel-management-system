import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RoomImageParamDto {
  @ApiProperty({ example: '1', description: 'ID phòng' })
  @IsNumberString(
    { no_symbols: true },
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING') },
  )
  id!: string;

  @ApiProperty({ example: '1', description: 'ID ảnh' })
  @IsNumberString(
    { no_symbols: true },
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING') },
  )
  imageId!: string;
}
