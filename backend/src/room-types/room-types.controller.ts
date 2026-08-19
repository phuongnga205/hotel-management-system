import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EntityIdParamDto } from '../common/dto/entity-id-param.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { ListRoomTypesDto } from './dto/list-room-types.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomTypesService } from './room-types.service';

@ApiTags('Room Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly service: RoomTypesService) {}

  @Post()
  create(@Body() dto: CreateRoomTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: ListRoomTypesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: EntityIdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: EntityIdParamDto, @Body() dto: UpdateRoomTypeDto) {
    return this.service.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: EntityIdParamDto) {
    return this.service.remove(params.id);
  }
}
