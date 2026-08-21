import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { DateTime } from 'luxon';
import { MailService } from '../mail/mail.service';
import { EmailType } from '../mail/entities/email-log.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import {
  MonthlyReportDispatch,
  ReportDispatchStatus,
} from './entities/monthly-report-dispatch.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { Booking } from '../bookings/entities/booking.entity';
import { getMonthlyReportHtml } from '../mail/templates/monthly-report.template';

export const REPORT_SCHEDULER = {
  CRON: '55 23 28-31 * *',
  TIME_ZONE: 'Asia/Ho_Chi_Minh',
} as const;

const ADMIN_BATCH_SIZE = 100;

@Injectable()
export class ReportsService {
  // sunlint-disable-next-line C014
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(MonthlyReportDispatch)
    private readonly dispatchRepository: Repository<MonthlyReportDispatch>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(REPORT_SCHEDULER.CRON, {
    timeZone: REPORT_SCHEDULER.TIME_ZONE,
  })
  async generateMonthlyReport(): Promise<void> {
    try {
      const timeZone = this.configService.get<string>('TIME_ZONE', REPORT_SCHEDULER.TIME_ZONE);
      const now = DateTime.now().setZone(timeZone);
      
      const tomorrow = now.plus({ days: 1 });
      const isLastDayOfMonth = tomorrow.day === 1;

      if (!isLastDayOfMonth) {
        return;
      }

      const reportMonth = now.toFormat('yyyy-MM');
      this.logger.log(`Generating monthly report for ${reportMonth}...`);

      const startDate = now.startOf('month').toJSDate();
      const nextMonth = now.plus({ months: 1 }).startOf('month').toJSDate();

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
        .select('COUNT(payment.id)', 'paidBookingsCount')
        .addSelect('COALESCE(SUM(payment.amount), 0)', 'totalRevenue')
        .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
        .andWhere('payment.createdAt >= :startDate', { startDate })
        .andWhere('payment.createdAt < :nextMonth', { nextMonth })
        .getRawOne<{ paidBookingsCount: string; totalRevenue: string }>();

      const paidBookingsCount = parseInt(
        revenueSummary?.paidBookingsCount || '0',
        10,
      );
      const totalRevenue = parseFloat(revenueSummary?.totalRevenue || '0');

      const title = this.i18n.t('messages.REPORTS.MONTHLY.TITLE', { args: { reportMonth } });
      const totalBookingsLabel = this.i18n.t('messages.REPORTS.MONTHLY.TOTAL_BOOKINGS_LABEL');
      const totalPaidBookingsLabel = this.i18n.t('messages.REPORTS.MONTHLY.TOTAL_PAID_BOOKINGS_LABEL');
      const totalRevenueLabel = this.i18n.t('messages.REPORTS.MONTHLY.TOTAL_REVENUE_LABEL');
      const subject = this.i18n.t('messages.REPORTS.MONTHLY.SUBJECT', { args: { reportMonth } });

      let offset = 0;
      let totalQueued = 0;

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
            await this.dataSource.transaction(async (manager) => {
              // Idempotency check via DB
              const result = await manager
                .createQueryBuilder()
                .insert()
                .into(MonthlyReportDispatch)
                .values({
                  reportMonth,
                  recipientId: admin.id,
                  status: ReportDispatchStatus.PENDING,
                })
                .orIgnore()
                .execute();

              if (result.identifiers.length === 0) {
                return; // Already dispatched or in progress
              }

              const description = this.i18n.t('messages.REPORTS.MONTHLY.DESCRIPTION', {
                args: { firstName: admin.fullName || 'Admin', reportMonth },
              });

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

              // Transactional Outbox will handle this robustly inside createOutbox
              await this.mailService.createOutbox(manager, {
                type: EmailType.MONTHLY_REPORT,
                to: admin.email,
                subject,
                text: `${description}\n${totalBookingsLabel} ${totalBookings}\n${totalPaidBookingsLabel} ${paidBookingsCount}\n${totalRevenueLabel} $${totalRevenue.toFixed(2)}`,
                html,
              });

              // Mark dispatch as QUEUED
              await manager.update(
                MonthlyReportDispatch,
                { reportMonth, recipientId: admin.id },
                { status: ReportDispatchStatus.QUEUED },
              );
            });
            totalQueued++;
          } catch (error: unknown) {
            this.logger.error(`Failed to process admin ${admin.id}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        offset += admins.length;
      }

      this.logger.log(
        `Monthly report for ${reportMonth} queued successfully to ${totalQueued} admins.`,
      );
    } catch (error: unknown) {
      this.logger.error('Failed to generate monthly report', {
        error: error instanceof Error ? error.message : String(error),
        context: 'generateMonthlyReport',
      });
    }
  }
}
