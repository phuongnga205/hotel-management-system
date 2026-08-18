import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ROOM_PAGINATION } from '../constants/room-pagination.constants';

export class ListRoomsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = ROOM_PAGINATION.DEFAULT_SKIP;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ROOM_PAGINATION.MAX_TAKE)
  take = ROOM_PAGINATION.DEFAULT_TAKE;
}
