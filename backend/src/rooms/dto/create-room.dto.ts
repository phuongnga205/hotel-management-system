import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  IsNumberString,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RoomStatus } from '../enums/room-status.enum';
import { Type } from 'class-transformer';
import { RoomViewType } from '../enums/room-view-type.enum';

export class CreateRoomDto {
  @ApiProperty({
    description: 'The room number',
    example: '101',
  })
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MaxLength(20, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  roomNumber!: string;

  @ApiProperty({
    description: 'The name of the room',
    example: 'Deluxe Suite',
  })
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MaxLength(150, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  name!: string;

  @ApiProperty({
    description: 'Loại phòng (nhãn tự do, vd "Deluxe", "Suite")',
    example: 'Deluxe',
  })
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MaxLength(50, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  roomType!: string;

  @ApiPropertyOptional({
    description: 'The description of the room',
    example: 'A luxurious suite with a king-size bed and ocean view',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  description?: string;

  @ApiPropertyOptional({
    description: 'The view type of the room',
    enum: RoomViewType,
    example: RoomViewType.SEA_VIEW,
  })
  @IsOptional()
  @IsEnum(RoomViewType, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  viewType?: RoomViewType;

  @ApiProperty({
    description: 'The capacity of the room',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @IsPositive({ message: i18nValidationMessage('messages.VALIDATION.MIN') })
  capacity!: number;

  @ApiProperty({
    description: 'The price per night for the room',
    example: 150.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER') },
  )
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @Min(0, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  pricePerNight!: number;

  @ApiPropertyOptional({
    description: 'The status of the room',
    enum: RoomStatus,
    example: RoomStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(RoomStatus, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  status?: RoomStatus;

  @ApiProperty({
    description: 'Amenity IDs assigned when the room is created',
    example: ['1', '2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsNumberString({}, { each: true })
  amenityIds?: string[];
}
