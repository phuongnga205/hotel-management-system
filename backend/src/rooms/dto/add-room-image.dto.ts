import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AddRoomImageDto {
  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean({
    message: i18nValidationMessage('messages.VALIDATION.IS_BOOLEAN'),
  })
  isThumbnail?: boolean;
}
