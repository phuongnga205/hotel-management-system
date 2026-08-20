import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

// Dead code — không có ImagesController/ImagesService nào dùng DTO này (đã
// xoá, xem RoomsModule/RoomsService: toàn bộ logic ảnh phòng giờ nằm ở
// RoomsService.addImage()/AddRoomImageDto, upload thẳng Cloudinary). Giữ lại
// vì scaffold cũ chưa dọn — cập nhật theo đúng shape Cloudinary hiện tại
// (image.entity.ts) để không gây hiểu nhầm nếu có người đọc/dùng lại sau.
export class CreateImageDto {
  @ApiProperty({
    description: 'The ID of the room this image belongs to',
    example: '1',
  })
  @IsNumberString(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING') },
  )
  roomId!: string;

  @ApiProperty({
    description: 'Cloudinary secure_url of the uploaded image',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1/rooms/room-1/9f1c2b3a.jpg',
  })
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MaxLength(500, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  imageUrl!: string;

  @ApiPropertyOptional({
    description:
      'Cloudinary public_id of the uploaded image (dùng để xoá đúng asset)',
    example: 'rooms/room-1/9f1c2b3a',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(255, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  imagePublicId?: string;

  @ApiPropertyOptional({
    description: 'Whether this image is the room thumbnail',
    example: false,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('messages.VALIDATION.IS_BOOLEAN'),
  })
  isThumbnail?: boolean;
}
