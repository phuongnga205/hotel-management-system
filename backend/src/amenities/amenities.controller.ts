/* sunlint-disable S037 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AmenitiesService } from './amenities.service';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { ListAmenitiesDto } from './dto/list-amenities.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EntityIdParamDto } from '../common/dto/entity-id-param.dto';

@ApiTags('Amenities')
@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  // GET /amenities và GET /amenities/:id không guard — FE public cần đọc
  // catalogue tên tiện nghi để hiển thị badge trên phòng và dựng filter UI
  // cho GET /rooms/available?amenities=. Chỉ thao tác ghi mới yêu cầu Admin.
  @Get()
  @ApiOperation({ summary: 'Xem danh sách tiện nghi (catalogue)' })
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
    description: 'Trả về danh sách tiện nghi (đã phân trang)',
  })
  @ApiResponse({ status: 400, description: 'Tham số page/limit không hợp lệ' })
  findAll(@Query() query: ListAmenitiesDto) {
    return this.amenitiesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết 1 tiện nghi' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID tiện nghi',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Trả về thông tin tiện nghi' })
  @ApiResponse({ status: 400, description: 'ID tiện nghi không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tiện nghi' })
  findOne(@Param() params: EntityIdParamDto) {
    return this.amenitiesService.findOne(params.id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo tiện nghi mới' })
  @ApiResponse({ status: 201, description: 'Tạo tiện nghi thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 409, description: 'Tên tiện nghi đã tồn tại' })
  create(@Body() createAmenityDto: CreateAmenityDto) {
    return this.amenitiesService.create(createAmenityDto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Chỉnh sửa tiện nghi' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID tiện nghi',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tiện nghi' })
  @ApiResponse({ status: 409, description: 'Tên tiện nghi đã tồn tại' })
  update(
    @Param() params: EntityIdParamDto,
    @Body() updateAmenityDto: UpdateAmenityDto,
  ) {
    return this.amenitiesService.update(params.id, updateAmenityDto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá tiện nghi (xoá mềm)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID tiện nghi',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Xoá thành công' })
  @ApiResponse({ status: 400, description: 'ID tiện nghi không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tiện nghi' })
  remove(@Param() params: EntityIdParamDto) {
    return this.amenitiesService.remove(params.id);
  }
}
