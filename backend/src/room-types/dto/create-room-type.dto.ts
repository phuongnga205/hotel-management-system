import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoomTypeDto {
  @ApiProperty({ example: 'Deluxe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Premium room with additional facilities' })
  @IsOptional()
  @IsString()
  description?: string;
}
