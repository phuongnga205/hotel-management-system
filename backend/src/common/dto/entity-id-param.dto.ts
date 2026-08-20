import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class EntityIdParamDto {
  @ApiProperty({ example: '1' })
  @IsNumberString(
    { no_symbols: true },
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING') },
  )
  id!: string;
}
