import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLog } from './entities/email-log.entity';
import { MailController } from './mail.controller';
import { AdminEmailLogsController } from './admin-email-logs.controller';
import { MAIL_QUEUE } from './mail.constants';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLog]),
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
  ],
  controllers: [MailController, AdminEmailLogsController],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
