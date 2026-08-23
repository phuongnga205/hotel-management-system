import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateRoomPriceDto {
  @ApiProperty({ example: 1500000, minimum: 0 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER') },
  )
  @Min(0, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  pricePerNight!: number;
}
