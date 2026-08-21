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

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLog, MailOutbox]),
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
  ],
  controllers: [MailController, AdminEmailLogsController],
  providers: [MailService, MailProcessor, OutboxProcessor],
  exports: [MailService],
})
export class MailModule {}
