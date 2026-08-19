import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomsExportService } from './rooms-export.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ROOM_EXPORT } from './constants/room-export.constants';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RoomPersistenceExceptionFilter } from './filters/room-persistence-exception.filter';
import { UpdateRoomPriceDto } from './dto/update-room-price.dto';
import { UpdateRoomAmenitiesDto } from './dto/update-room-amenities.dto';
import { AddRoomImageDto } from './dto/add-room-image.dto';
import { EntityIdParamDto } from '../common/dto/entity-id-param.dto';
import { RoomAmenityParamDto } from './dto/room-amenity-param.dto';
import { RoomImageParamDto } from './dto/room-image-param.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ROOM_IMAGE } from './constants/room-image.constants';
import { RoomImageValidationPipe } from './pipes/room-image-validation.pipe';
import { RoomImageUploadExceptionFilter } from './filters/room-image-upload-exception.filter';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(RoomPersistenceExceptionFilter, RoomImageUploadExceptionFilter)
@Roles(UserRole.ADMIN)
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly roomsExportService: RoomsExportService,
  ) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  findAll(@Query() query: ListRoomsDto) {
    return this.roomsService.findAll(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export room list to an Excel file' })
  @ApiProduces(ROOM_EXPORT.MIME_TYPE)
  @ApiOkResponse({
    description: 'Excel file containing the room list',
    schema: { type: 'string', format: 'binary' },
  })
  exportToExcel(): StreamableFile {
    const file = this.roomsExportService.exportToExcel();

    return new StreamableFile(file, {
      type: ROOM_EXPORT.MIME_TYPE,
      disposition: `attachment; filename="${ROOM_EXPORT.FILE_NAME}"`,
    });
  }

  @Get(':id')
  findOne(@Param() params: EntityIdParamDto) {
    return this.roomsService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: EntityIdParamDto, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(params.id, dto);
  }

  @Patch(':id/price')
  @ApiOperation({ summary: 'Update the nightly room price' })
  updatePrice(
    @Param() params: EntityIdParamDto,
    @Body() updateRoomPriceDto: UpdateRoomPriceDto,
  ) {
    return this.roomsService.updatePrice(params.id, updateRoomPriceDto);
  }

  @Post(':id/amenities')
  @ApiOperation({ summary: 'Assign amenities to a room' })
  addAmenities(
    @Param() params: EntityIdParamDto,
    @Body() updateRoomAmenitiesDto: UpdateRoomAmenitiesDto,
  ) {
    return this.roomsService.addAmenities(params.id, updateRoomAmenitiesDto);
  }

  @Delete(':id/amenities/:amenityId')
  @ApiOperation({ summary: 'Remove an amenity from a room' })
  removeAmenity(@Param() params: RoomAmenityParamDto) {
    return this.roomsService.removeAmenity(params.id, params.amenityId);
  }

  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor(ROOM_IMAGE.FIELD_NAME, {
      limits: { fileSize: ROOM_IMAGE.MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [ROOM_IMAGE.FIELD_NAME],
      properties: {
        file: { type: 'string', format: 'binary' },
        isThumbnail: { type: 'boolean', default: false },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an image for a room' })
  addImage(
    @Param() params: EntityIdParamDto,
    @UploadedFile(RoomImageValidationPipe)
    file: Express.Multer.File,
    @Body() dto: AddRoomImageDto,
  ) {
    return this.roomsService.addImage(params.id, file, dto);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Soft delete an image belonging to a room' })
  removeImage(@Param() params: RoomImageParamDto) {
    return this.roomsService.removeImage(params.id, params.imageId);
  }

  @Delete(':id')
  remove(@Param() params: EntityIdParamDto) {
    return this.roomsService.remove(params.id);
  }
}
