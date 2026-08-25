import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Decimal } from 'decimal.js';
import { CronJob } from 'cron';
import { MailService } from '../mail/mail.service';
import {
  EmailLog,
  EmailStatus,
  EmailType,
} from '../mail/entities/email-log.entity';
import {
  MonthlyReportDispatch,
  ReportDispatchStatus,
} from './entities/monthly-report-dispatch.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { Booking } from '../bookings/entities/booking.entity';
import { getMonthlyReportHtml } from '../mail/templates/monthly-report.template';
import {
  ENVIRONMENT_KEYS,
  DEFAULT_REPORT_CRON,
  DEFAULT_REPORT_TIME_ZONE,
} from '../config/environment.constants';
import { ReportEmailLogNotFoundError } from './errors/report-email-log-not-found.error';
import { REPORT_CLOCK } from './report-clock.provider';
import type { ReportClock } from './report-clock.provider';

const MONTHLY_REPORT_JOB_NAME = 'monthly-report-job';

const ADMIN_BATCH_SIZE = 100;

@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(REPORT_CLOCK)
    private readonly clock: ReportClock,
  ) {}

  onModuleInit() {
    try {
      const cronExpression = this.configService.get<string>(
        ENVIRONMENT_KEYS.REPORT_CRON,
        DEFAULT_REPORT_CRON,
      );

      const timeZone = this.configService.get<string>(
        ENVIRONMENT_KEYS.REPORT_TIME_ZONE,
        DEFAULT_REPORT_TIME_ZONE,
      );

      const job = new CronJob(
        cronExpression,
        () => {
          this.generateMonthlyReport().catch((err: unknown) => {
            this.logger.error(
              'Error generating monthly report',
              err instanceof Error ? err.stack : String(err),
            );
          });
        },
        null,
        false,
        timeZone,
      );

      this.schedulerRegistry.addCronJob(MONTHLY_REPORT_JOB_NAME, job);
      job.start();
      this.logger.log(`Scheduled monthly report with cron: ${cronExpression}`);
    } catch (error: unknown) {
      this.logger.error(
        'Failed to initialize monthly report schedule',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async generateMonthlyReport(): Promise<void> {
    try {
      const timeZone = this.configService.get<string>(
        ENVIRONMENT_KEYS.REPORT_TIME_ZONE,
        DEFAULT_REPORT_TIME_ZONE,
      );

      const reportPeriod = this.clock.now().setZone(timeZone);

      // REPORT_CRON runs on days 28-31 because standard cron syntax has no
      // dedicated "last day" operator. Only the real final calendar day may
      // enqueue a report, preventing premature or duplicate monthly sends.
      if (reportPeriod.day !== reportPeriod.daysInMonth) {
        return;
      }

      const reportMonth = reportPeriod.toFormat('yyyy-MM');
      const startDate = reportPeriod.startOf('month').toUTC().toJSDate();
      const nextMonth = reportPeriod
        .plus({ months: 1 })
        .startOf('month')
        .toUTC()
        .toJSDate();

      this.logger.log(`Generating monthly report for ${reportMonth}...`);

      // Aggregate Bookings (COUNT)
      const bookingSummary = await this.bookingRepository
        .createQueryBuilder('booking')
        .select('COUNT(booking.id)', 'totalBookings')
        .where('booking.createdAt >= :startDate', { startDate })
        .andWhere('booking.createdAt < :nextMonth', { nextMonth })
        .getRawOne<{ totalBookings: string }>();

      const totalBookings = parseInt(bookingSummary?.totalBookings || '0', 10);

      // Aggregate Payments (COUNT & SUM)
      const revenueSummary = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('COUNT(DISTINCT payment.bookingId)', 'paidBookingsCount')
        .addSelect('COALESCE(SUM(payment.amount), 0)', 'totalRevenue')
        .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
        .andWhere('payment.paidAt >= :startDate', { startDate })
        .andWhere('payment.paidAt < :nextMonth', { nextMonth })
        .getRawOne<{ paidBookingsCount: string; totalRevenue: string }>();

      const paidBookingsCount = parseInt(
        revenueSummary?.paidBookingsCount || '0',
        10,
      );
      const totalRevenueStr = revenueSummary?.totalRevenue || '0';
      const totalRevenue = new Decimal(totalRevenueStr).toNumber();

      const title = this.i18n.t('messages.REPORTS.MONTHLY.TITLE', {
        args: { reportMonth },
      });
      const totalBookingsLabel = this.i18n.t(
        'messages.REPORTS.MONTHLY.TOTAL_BOOKINGS_LABEL',
      );
      const totalPaidBookingsLabel = this.i18n.t(
        'messages.REPORTS.MONTHLY.TOTAL_PAID_BOOKINGS_LABEL',
      );
      const totalRevenueLabel = this.i18n.t(
        'messages.REPORTS.MONTHLY.TOTAL_REVENUE_LABEL',
      );
      const subject = this.i18n.t('messages.REPORTS.MONTHLY.SUBJECT', {
        args: { reportMonth },
      });

      let offset = 0;
      let totalDispatched = 0;

      while (true) {
        const admins = await this.userRepository
          .createQueryBuilder('user')
          .select(['user.id', 'user.email', 'user.fullName'])
          .where('user.role = :role', { role: UserRole.ADMIN })
          .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
          .orderBy('user.id', 'ASC')
          .limit(ADMIN_BATCH_SIZE)
          .offset(offset)
          .getMany();

        if (admins.length === 0) break;

        for (const admin of admins) {
          try {
            const emailLog = await this.dataSource.transaction(
              async (manager) => {
                await manager.query(
                  'SELECT pg_advisory_xact_lock(hashtext($1))',
                  [`monthly-report:${reportMonth}:${admin.id}`],
                );

                let dispatch = await manager.findOne(MonthlyReportDispatch, {
                  where: { reportMonth, recipientId: admin.id },
                });

                if (
                  dispatch &&
                  dispatch.status !== ReportDispatchStatus.FAILED
                ) {
                  return null;
                }

                if (!dispatch) {
                  dispatch = await manager.save(
                    MonthlyReportDispatch,
                    manager.create(MonthlyReportDispatch, {
                      reportMonth,
                      recipientId: admin.id,
                      status: ReportDispatchStatus.PENDING,
                    }),
                  );
                }

                const recipientName = this.i18n.t(
                  'messages.REPORTS.MONTHLY.DEFAULT_RECIPIENT_NAME',
                );
                const description = this.i18n.t(
                  'messages.REPORTS.MONTHLY.DESCRIPTION',
                  {
                    args: {
                      firstName: admin.fullName || recipientName,
                      reportMonth,
                    },
                  },
                );

                const html = getMonthlyReportHtml(
                  reportMonth,
                  totalBookings,
                  paidBookingsCount,
                  totalRevenue,
                  title,
                  description,
                  totalBookingsLabel,
                  totalPaidBookingsLabel,
                  totalRevenueLabel,
                );

                let emailLog: EmailLog;
                if (dispatch.emailLogId) {
                  const existingEmailLog = await manager.findOne(EmailLog, {
                    where: { id: dispatch.emailLogId },
                  });
                  if (!existingEmailLog) {
                    throw new ReportEmailLogNotFoundError(dispatch.emailLogId);
                  }
                  existingEmailLog.status = EmailStatus.PENDING;
                  existingEmailLog.lastError = null;
                  existingEmailLog.retryGeneration += 1;
                  emailLog = await manager.save(EmailLog, existingEmailLog);
                  await this.mailService.createOutboxForExisting(
                    manager,
                    emailLog,
                  );
                } else {
                  emailLog = await this.mailService.createOutbox(
                    manager,
                    {
                      type: EmailType.MONTHLY_REPORT,
                      to: admin.email,
                      subject,
                      text: `${description}\n${totalBookingsLabel} ${totalBookings}\n${totalPaidBookingsLabel} ${paidBookingsCount}\n${totalRevenueLabel} $${totalRevenue.toFixed(2)}`,
                      html,
                    },
                    { reportMonth, recipientUserId: admin.id },
                  );
                }

                await manager.update(
                  MonthlyReportDispatch,
                  { reportMonth, recipientId: admin.id },
                  {
                    status: ReportDispatchStatus.PENDING,
                    emailLogId: emailLog.id,
                  },
                );

                return emailLog;
              },
            );

            if (emailLog) {
              totalDispatched++;
            }
          } catch (error: unknown) {
            this.logger.error(`Failed to process admin ${admin.id}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        offset += admins.length;
      }

      this.logger.log(
        `Monthly report for ${reportMonth} queued successfully to ${totalDispatched} admins.`,
      );
    } catch (error: unknown) {
      this.logger.error('Failed to generate monthly report', {
        error: error instanceof Error ? error.message : String(error),
        context: 'generateMonthlyReport',
      });
      throw error;
    }
  }
}
