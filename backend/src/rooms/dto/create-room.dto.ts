import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomViewType } from '../enums/room-view-type.enum';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(RoomViewType)
  viewType?: RoomViewType | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
