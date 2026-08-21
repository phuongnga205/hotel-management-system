import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateAmenityDto {
  @ApiProperty({
    description: 'The name of the amenity',
    example: 'Free Wi-Fi',
  })
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MaxLength(100, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  name!: string;

  @ApiProperty({
    description: 'The description of the amenity',
    example: 'High-speed internet access throughout the hotel',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  description?: string;
}
