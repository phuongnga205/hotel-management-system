import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateImageDto {
  @ApiProperty({
    description: 'The ID of the room this image belongs to',
    example: '1',
  })
  @IsNumberString()
  roomId!: string;

  @ApiProperty({
    description: 'Local path/URL of the uploaded image',
    example: '/uploads/rooms/1/photo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  imageUrl!: string;

  @ApiPropertyOptional({
    description: 'Whether this image is the room thumbnail',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isThumbnail?: boolean;
}
