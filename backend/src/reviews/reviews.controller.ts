import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ReviewDeleteDto } from './dto/review-delete.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @GetUser("id") userId: string,
    @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(userId, createReviewDto);
  }


  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Get('room/:roomId')
  async findByRoom(
    @Param('roomId') roomId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findByRoom(roomId, query);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findAll(query);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @Body('deleteReason') deleteReason: ReviewDeleteDto,
  ) {
    return this.reviewsService.remove(
      id,
      deleteReason,
    );
  }

}
