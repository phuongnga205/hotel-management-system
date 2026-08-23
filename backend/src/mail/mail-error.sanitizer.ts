import { Injectable } from '@nestjs/common';

@Injectable()
export class MailErrorSanitizer {
  toPublicCode(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Auth')) {
      return 'SMTP_AUTH_FAILED';
    }
    if (message.includes('Timeout') || message.includes('ETIMEDOUT')) {
      return 'SMTP_TIMEOUT';
    }
    if (message.includes('Recipient') || message.includes('rejected')) {
      return 'SMTP_RECIPIENT_REJECTED';
    }

    return 'SMTP_DELIVERY_FAILED';
  }
}
