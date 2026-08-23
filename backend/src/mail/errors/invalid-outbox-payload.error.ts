export class InvalidOutboxPayloadError extends Error {
  constructor(outboxId: string) {
    super(`Invalid outbox payload for id: ${outboxId}`);
    this.name = 'InvalidOutboxPayloadError';
  }
}
