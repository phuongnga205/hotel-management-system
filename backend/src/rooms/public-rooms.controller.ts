import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { ListPublicRoomsDto } from './dto/list-public-rooms.dto';
import { FindAvailableRoomsDto } from './dto/find-available-rooms.dto';
import { RoomPersistenceExceptionFilter } from './filters/room-persistence-exception.filter';
import { EntityIdParamDto } from '../common/dto/entity-id-param.dto';
import { RoomStatus } from './enums/room-status.enum';

@ApiTags('Rooms')
@UseFilters(RoomPersistenceExceptionFilter)
@Controller('rooms')
export class PublicRoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // Chỉ trả phòng status=ACTIVE (ép ở RoomsService.findPublicList()) —
  // khác GET /admin/rooms thấy được cả INACTIVE/MAINTENANCE.
  @Get()
  @ApiOperation({ summary: 'Xem danh sách phòng (chỉ phòng đang hoạt động)' })
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
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách phòng (đã phân trang)',
  })
  @ApiResponse({ status: 400, description: 'Tham số page/limit không hợp lệ' })
  findAll(@Query() query: ListPublicRoomsDto) {
    return this.roomsService.findPublicList(query);
  }

  @Get('available')
  @ApiOperation({
    summary: 'Tìm phòng còn trống theo khoảng ngày (checkIn/checkOut bắt buộc)',
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
    name: 'checkIn',
    required: true,
    type: String,
    example: '2026-09-01',
    description: 'Ngày nhận phòng (bắt buộc)',
  })
  @ApiQuery({
    name: 'checkOut',
    required: true,
    type: String,
    example: '2026-09-05',
    description: 'Ngày trả phòng (bắt buộc, phải sau checkIn)',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    example: 500000,
    description: 'Giá thấp nhất/đêm',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    example: 2000000,
    description: 'Giá cao nhất/đêm',
  })
  @ApiQuery({
    name: 'amenities',
    required: false,
    type: String,
    example: 'wifi,pool',
    description: 'Danh sách tên tiện nghi, phân tách bởi dấu phẩy',
  })
  @ApiResponse({ status: 200, description: 'Trả về danh sách phòng còn trống' })
  @ApiResponse({
    status: 400,
    description:
      'Thiếu ngày hoặc khoảng ngày không hợp lệ (checkOut <= checkIn)',
  })
  getAvailableRooms(@Query() query: FindAvailableRoomsDto) {
    return this.roomsService.findAvailableRooms(query);
  }

  // Chỉ trả phòng status=ACTIVE, giống findAll() ở trên — 1 phòng
  // INACTIVE/MAINTENANCE dù biết đúng id cũng không xem được qua route này.
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phòng' })
  @ApiParam({ name: 'id', type: String, description: 'ID phòng', example: '1' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin phòng' })
  @ApiResponse({ status: 400, description: 'ID phòng không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  findOne(@Param() params: EntityIdParamDto) {
    return this.roomsService.findOne(params.id, RoomStatus.ACTIVE);
  }
}
