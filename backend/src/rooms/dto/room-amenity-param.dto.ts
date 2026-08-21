import { IsNumberString } from 'class-validator';

export class RoomAmenityParamDto {
  @IsNumberString({ no_symbols: true })
  id!: string;

  @IsNumberString({ no_symbols: true })
  amenityId!: string;
}
