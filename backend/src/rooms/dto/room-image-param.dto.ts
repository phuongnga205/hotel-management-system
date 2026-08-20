import { IsNumberString } from 'class-validator';

export class RoomImageParamDto {
  @IsNumberString({ no_symbols: true })
  id!: string;

  @IsNumberString({ no_symbols: true })
  imageId!: string;
}
