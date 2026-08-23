export const MAIL_ERROR_CODE = {
  DELIVERY_FAILED: 'MAIL_DELIVERY_FAILED',
} as const;

export class MailDeliveryError extends Error {
  public readonly code: string;

  constructor(code: string, options?: ErrorOptions) {
    super(code, options);
    this.name = 'MailDeliveryError';
    this.code = code;
  }
}
