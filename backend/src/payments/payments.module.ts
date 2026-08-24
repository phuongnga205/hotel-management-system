import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AdminPaymentsController } from './admin-payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [TypeOrmModule],
})
export class PaymentsModule {}
