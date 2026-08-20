import { IsNumberString } from 'class-validator';

export class EntityIdParamDto {
  @IsNumberString({ no_symbols: true })
  id!: string;
}
