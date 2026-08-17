import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomsExportService } from './rooms-export.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ROOM_EXPORT } from './constants/room-export.constants';

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
  findAll() {
    return this.roomsService.findAll();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export room list to an Excel file' })
  @ApiProduces(ROOM_EXPORT.MIME_TYPE)
  @ApiOkResponse({
    description: 'Excel file containing the room list',
    schema: { type: 'string', format: 'binary' },
  })
  async exportToExcel(): Promise<StreamableFile> {
    const file = await this.roomsExportService.exportToExcel();

    return new StreamableFile(file, {
      type: ROOM_EXPORT.MIME_TYPE,
      disposition: `attachment; filename="${ROOM_EXPORT.FILE_NAME}"`,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(+id, updateRoomDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(+id);
  }
}
