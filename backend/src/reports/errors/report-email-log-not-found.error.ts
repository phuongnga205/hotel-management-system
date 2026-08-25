export class ReportEmailLogNotFoundError extends Error {
  constructor(emailLogId: string) {
    super(`Report email log not found: ${emailLogId}`);
    this.name = 'ReportEmailLogNotFoundError';
  }
}
