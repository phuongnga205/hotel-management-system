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
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomsExportService } from './rooms-export.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ROOM_EXPORT } from './constants/room-export.constants';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { RoomStatus } from './enums/room-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
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

@ApiTags('Admin - Rooms')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(RoomPersistenceExceptionFilter, RoomImageUploadExceptionFilter)
@Roles(UserRole.ADMIN)
@Controller('admin/rooms')
export class AdminRoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly roomsExportService: RoomsExportService,
  ) {}

  @Post()
  @ApiOperation({ summary: '[Admin] Tạo phòng mới' })
  @ApiResponse({ status: 201, description: 'Tạo phòng thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({
    status: 404,
    description: 'Một hoặc nhiều amenityIds không tồn tại',
  })
  @ApiResponse({ status: 409, description: 'Số phòng (roomNumber) đã tồn tại' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  @ApiOperation({
    summary: '[Admin] Lấy danh sách phòng',
    description:
      'Trả về mọi trạng thái (ACTIVE/INACTIVE/MAINTENANCE), có thể lọc thêm theo status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Số trang (bắt đầu từ 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số bản ghi mỗi trang (tối đa 100)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RoomStatus,
    description: 'Lọc theo trạng thái phòng',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách phòng (đã phân trang)',
  })
  @ApiResponse({ status: 400, description: 'Tham số truy vấn không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  findAll(@Query() query: ListRoomsDto) {
    return this.roomsService.findAll(query);
  }

  @Get('export')
  @ApiOperation({ summary: '[Admin] Export room list to an Excel file' })
  @ApiProduces(ROOM_EXPORT.MIME_TYPE)
  @ApiOkResponse({
    description: 'Excel file containing the room list',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  exportToExcel(): StreamableFile {
    const file = this.roomsExportService.exportToExcel();

    return new StreamableFile(file, {
      type: ROOM_EXPORT.MIME_TYPE,
      disposition: `attachment; filename="${ROOM_EXPORT.FILE_NAME}"`,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Xem chi tiết 1 phòng (bất kể trạng thái)' })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin phòng' })
  @ApiResponse({ status: 400, description: 'ID phòng không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  findOne(@Param() params: EntityIdParamDto) {
    return this.roomsService.findOne(params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Cập nhật thông tin phòng' })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  @ApiResponse({ status: 409, description: 'Số phòng (roomNumber) đã tồn tại' })
  update(@Param() params: EntityIdParamDto, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(params.id, dto);
  }

  @Patch(':id/price')
  @ApiOperation({ summary: '[Admin] Update the nightly room price' })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiResponse({ status: 200, description: 'Cập nhật giá thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  updatePrice(
    @Param() params: EntityIdParamDto,
    @Body() updateRoomPriceDto: UpdateRoomPriceDto,
  ) {
    return this.roomsService.updatePrice(params.id, updateRoomPriceDto);
  }

  @Post(':id/amenities')
  @ApiOperation({ summary: '[Admin] Assign amenities to a room' })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiResponse({ status: 201, description: 'Gán tiện nghi thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({
    status: 404,
    description:
      'Không tìm thấy phòng, hoặc một/nhiều amenityIds không tồn tại',
  })
  addAmenities(
    @Param() params: EntityIdParamDto,
    @Body() updateRoomAmenitiesDto: UpdateRoomAmenitiesDto,
  ) {
    return this.roomsService.addAmenities(params.id, updateRoomAmenitiesDto);
  }

  @Delete(':id/amenities/:amenityId')
  @ApiOperation({ summary: '[Admin] Remove an amenity from a room' })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiParam({
    name: 'amenityId',
    type: String,
    description: 'ID tiện nghi',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Gỡ tiện nghi thành công' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({
    status: 404,
    description:
      'Không tìm thấy phòng, hoặc tiện nghi chưa được gán cho phòng này',
  })
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
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
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
  @ApiOperation({ summary: '[Admin] Upload an image for a room' })
  @ApiResponse({ status: 201, description: 'Upload ảnh thành công' })
  @ApiResponse({
    status: 400,
    description: 'Thiếu file, hoặc nội dung file không phải ảnh hợp lệ',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  @ApiResponse({ status: 413, description: 'File ảnh vượt quá 5 MB' })
  @ApiResponse({
    status: 415,
    description: 'Định dạng ảnh không được hỗ trợ (chỉ JPEG/PNG/WebP)',
  })
  addImage(
    @Param() params: EntityIdParamDto,
    @UploadedFile(RoomImageValidationPipe)
    file: Express.Multer.File,
    @Body() dto: AddRoomImageDto,
  ) {
    return this.roomsService.addImage(params.id, file, dto);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: '[Admin] Soft delete an image belonging to a room' })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiParam({
    name: 'imageId',
    type: String,
    description: 'ID ảnh',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Xoá ảnh thành công' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng, hoặc ảnh không thuộc về phòng này',
  })
  removeImage(@Param() params: RoomImageParamDto) {
    return this.roomsService.removeImage(params.id, params.imageId);
  }

  // Khác isThumbnail lúc addImage() (chỉ set được lúc upload) — route này
  // đổi thumbnail cho 1 ảnh ĐÃ tồn tại, không cần xoá + upload lại.
  @Patch(':id/images/:imageId/thumbnail')
  @ApiOperation({
    summary: '[Admin] Đặt 1 ảnh đã upload làm ảnh đại diện phòng',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiParam({
    name: 'imageId',
    type: String,
    description: 'ID ảnh',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Đặt ảnh đại diện thành công' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng, hoặc ảnh không thuộc về phòng này',
  })
  setThumbnail(@Param() params: RoomImageParamDto) {
    return this.roomsService.setThumbnail(params.id, params.imageId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[Admin] Xoá mềm phòng (cascade ảnh + liên kết tiện nghi)',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiResponse({ status: 200, description: 'Xoá thành công' })
  @ApiResponse({ status: 400, description: 'ID phòng không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  remove(@Param() params: EntityIdParamDto) {
    return this.roomsService.remove(params.id);
  }
}
