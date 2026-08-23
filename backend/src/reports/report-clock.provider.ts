import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

export const REPORT_CLOCK = Symbol('REPORT_CLOCK');

export interface ReportClock {
  now(): DateTime;
}

@Injectable()
export class DefaultReportClock implements ReportClock {
  now(): DateTime {
    return DateTime.now();
  }
}
