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
  toPublicCode(error: unknown): string {
    if (!error) return MAIL_ERROR_CODE.DELIVERY_FAILED;

    let message = '';
    let code = '';
    let statusCode: number | undefined;

    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      message =
        typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
      code = typeof errObj.code === 'string' ? errObj.code.toLowerCase() : '';
      statusCode =
        typeof errObj.statusCode === 'number' ? errObj.statusCode : undefined;
    } else {
      message =
        typeof error === 'string' ||
        typeof error === 'number' ||
        typeof error === 'boolean'
          ? String(error).toLowerCase()
          : '';
    }

    // 401 / 403 hoặc Brevo trả code "unauthorized"
    if (
      code.includes('unauthorized') ||
      message.includes('auth') ||
      statusCode === 401 ||
      statusCode === 403
    ) {
      return MAIL_ERROR_CODE.PROVIDER_AUTH_FAILED;
    }

    // 429 Too Many Requests
    if (
      code === 'too_many_requests' ||
      message.includes('rate limit') ||
      statusCode === 429
    ) {
      return MAIL_ERROR_CODE.PROVIDER_RATE_LIMITED;
    }

    // Brevo "invalid_parameter" thường do email recipient sai format
    if (
      code === 'invalid_parameter' ||
      message.includes('recipient') ||
      message.includes('rejected') ||
      message.includes('invalid')
    ) {
      return MAIL_ERROR_CODE.RECIPIENT_REJECTED;
    }

    // 5xx hoặc network timeout
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      (statusCode && statusCode >= 500)
    ) {
      return MAIL_ERROR_CODE.PROVIDER_UNAVAILABLE;
    }

    return MAIL_ERROR_CODE.DELIVERY_FAILED;
  }
}
