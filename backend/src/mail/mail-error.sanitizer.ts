import { Injectable } from '@nestjs/common';
import { MAIL_ERROR_CODE } from './errors/mail-delivery.error';

@Injectable()
export class MailErrorSanitizer {
  toPublicCode(error: unknown): string {
    const message = (
      error instanceof Error ? error.message : String(error)
    ).toLowerCase();

    if (message.includes('auth')) {
      return MAIL_ERROR_CODE.SMTP_AUTH_FAILED;
    }
    if (message.includes('timeout') || message.includes('etimedout')) {
      return MAIL_ERROR_CODE.SMTP_TIMEOUT;
    }
    if (message.includes('recipient') || message.includes('rejected')) {
      return MAIL_ERROR_CODE.SMTP_RECIPIENT_REJECTED;
    }

    return MAIL_ERROR_CODE.SMTP_DELIVERY_FAILED;
  }
}
