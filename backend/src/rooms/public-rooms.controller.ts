import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { ListPublicRoomsDto } from './dto/list-public-rooms.dto';
import { FindAvailableRoomsDto } from './dto/find-available-rooms.dto';
import { RoomPersistenceExceptionFilter } from './filters/room-persistence-exception.filter';

@UseFilters(RoomPersistenceExceptionFilter)
@Controller('rooms')
export class PublicRoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // Chỉ trả phòng status=ACTIVE (ép ở RoomsService.findPublicList()) —
  // khác GET /admin/rooms thấy được cả INACTIVE/MAINTENANCE.
  @Get()
  @ApiOperation({ summary: 'Xem danh sách phòng (chỉ phòng đang hoạt động)' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách phòng' })
  findAll(@Query() query: ListPublicRoomsDto) {
    return this.roomsService.findPublicList(query);
  }

  @Get('available')
  @ApiOperation({
    summary: 'Tìm phòng còn trống theo khoảng ngày (checkIn/checkOut bắt buộc)',
  })
  @ApiResponse({ status: 200, description: 'Trả về danh sách phòng còn trống' })
  @ApiResponse({
    status: 400,
    description: 'Thiếu ngày hoặc khoảng ngày không hợp lệ',
  })
  getAvailableRooms(@Query() query: FindAvailableRoomsDto) {
    return this.roomsService.findAvailableRooms(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phòng' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin phòng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }
}
