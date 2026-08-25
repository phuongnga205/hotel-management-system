import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { RoomReviewsController } from './room-reviews.controller';
import { Review } from './entities/review.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { DomainEventsModule } from '../common/events/domain-events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Booking]), DomainEventsModule],
  controllers: [
    ReviewsController,
    RoomReviewsController,
    AdminReviewsController,
  ],
  providers: [ReviewsService],
})
export class ReviewsModule {}
