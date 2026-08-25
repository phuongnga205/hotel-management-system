export const MONTHLY_REPORT_SCHEDULE = {
  JOB_NAME: 'monthly-report-job',
  RECOVERY_JOB_NAME: 'monthly-report-recovery-job',
  // Retry the previous month every 10 minutes during the first three hours
  // of day one. Existing unique constraints keep this idempotent.
  RECOVERY_CRON: '*/10 0-2 1 * *',
  ADMIN_BATCH_SIZE: 100,
} as const;
