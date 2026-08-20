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
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomsExportService } from './rooms-export.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ROOM_EXPORT } from './constants/room-export.constants';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RoomPersistenceExceptionFilter } from './filters/room-persistence-exception.filter';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(RoomPersistenceExceptionFilter)
@Roles(UserRole.ADMIN)
@Controller('admin/rooms')
export class AdminRoomsController {
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
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
