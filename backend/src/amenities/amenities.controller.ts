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
import { AmenitiesService } from './amenities.service';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { ListAmenitiesDto } from './dto/list-amenities.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { EntityIdParamDto } from '../common/dto/entity-id-param.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Post()
  create(@Body() createAmenityDto: CreateAmenityDto) {
    return this.amenitiesService.create(createAmenityDto);
  }

  @Get()
  findAll(@Query() query: ListAmenitiesDto) {
    return this.amenitiesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: EntityIdParamDto) {
    return this.amenitiesService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: EntityIdParamDto,
    @Body() updateAmenityDto: UpdateAmenityDto,
  ) {
    return this.amenitiesService.update(params.id, updateAmenityDto);
  }

  @Delete(':id')
  remove(@Param() params: EntityIdParamDto) {
    return this.amenitiesService.remove(params.id);
  }
}
