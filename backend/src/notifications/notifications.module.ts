import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsListener } from './notifications.listener';

@Module({
  imports: [MailModule],
  providers: [NotificationsListener],
})
export class NotificationsModule {}
