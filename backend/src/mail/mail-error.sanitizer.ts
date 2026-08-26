import { Injectable } from '@nestjs/common';
import { MAIL_ERROR_CODE } from './errors/mail-delivery.error';

@Injectable()
export class MailErrorSanitizer {
  /**
   * Map một error object (từ Brevo HTTP response hoặc network error)
   * về mã lỗi công khai trung lập với provider.
   *
   * Brevo trả về JSON: { "code": "unauthorized", "message": "..." }
   * và HTTP status code tương ứng được gắn vào error.statusCode.
   */
  toPublicCode(error: any): string {
    if (!error) return MAIL_ERROR_CODE.DELIVERY_FAILED;

    const message = (
      error.message || String(error)
    ).toLowerCase();

    const code = (error.code || '').toLowerCase();

    // 401 / 403 hoặc Brevo trả code "unauthorized"
    if (code === 'unauthorized' || message.includes('auth') || error.statusCode === 401 || error.statusCode === 403) {
      return MAIL_ERROR_CODE.PROVIDER_AUTH_FAILED;
    }

    // 429 Too Many Requests
    if (code === 'too_many_requests' || message.includes('rate limit') || error.statusCode === 429) {
      return MAIL_ERROR_CODE.PROVIDER_RATE_LIMITED;
    }

    // Brevo "invalid_parameter" thường do email recipient sai format
    if (code === 'invalid_parameter' || message.includes('recipient') || message.includes('rejected') || message.includes('invalid')) {
      return MAIL_ERROR_CODE.RECIPIENT_REJECTED;
    }

    // 5xx hoặc network timeout
    if (message.includes('timeout') || message.includes('etimedout') || message.includes('econnreset') || (error.statusCode && error.statusCode >= 500)) {
      return MAIL_ERROR_CODE.PROVIDER_UNAVAILABLE;
    }

    return MAIL_ERROR_CODE.DELIVERY_FAILED;
  }
}
