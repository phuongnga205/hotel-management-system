import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLog } from './entities/email-log.entity';
import { MailOutbox } from './entities/mail-outbox.entity';
import { MailController } from './mail.controller';
import { AdminEmailLogsController } from './admin-email-logs.controller';
import { MAIL_QUEUE } from './mail.constants';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';
import { OutboxProcessor } from './outbox.processor';
import { MailErrorSanitizer } from './mail-error.sanitizer';
import { EmailReconciliationService } from './email-reconciliation.service';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { MailEventsListener } from './mail-events.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLog, MailOutbox, Booking, User]),
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
  ],
  controllers: [MailController, AdminEmailLogsController],
  providers: [
    MailService,
    MailProcessor,
    OutboxProcessor,
    MailErrorSanitizer,
    EmailReconciliationService,
    MailEventsListener,
  ],
  exports: [MailService],
})
export class MailModule {}
