import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class EmailLogIdParamDto {
  @ApiProperty({ example: '1' })
  @IsNumberString()
  id!: string;
}
