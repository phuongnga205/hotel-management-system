export const MAIL_ERROR_CODE = {
  DELIVERY_FAILED: 'MAIL_DELIVERY_FAILED',
  PROVIDER_AUTH_FAILED: 'MAIL_PROVIDER_AUTH_FAILED',
  PROVIDER_RATE_LIMITED: 'MAIL_PROVIDER_RATE_LIMITED',
  RECIPIENT_REJECTED: 'MAIL_RECIPIENT_REJECTED',
  PROVIDER_UNAVAILABLE: 'MAIL_PROVIDER_UNAVAILABLE',
  OUTBOX_EXHAUSTED: 'OUTBOX_EXHAUSTED',
} as const;

export class MailDeliveryError extends Error {
  public readonly code: string;

  constructor(code: string, options?: ErrorOptions) {
    super(code, options);
    this.name = 'MailDeliveryError';
    this.code = code;
  }
}
