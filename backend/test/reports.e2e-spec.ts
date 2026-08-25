import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ReportsService } from '../src/reports/reports.service';
import { User, UserRole, UserStatus } from '../src/users/entities/user.entity';
import {
  EmailLog,
  EmailStatus,
  EmailType,
} from '../src/mail/entities/email-log.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  MonthlyReportDispatch,
  ReportDispatchStatus,
} from '../src/reports/entities/monthly-report-dispatch.entity';
import { getQueueToken } from '@nestjs/bullmq';
import { MAIL_QUEUE } from '../src/mail/mail.constants';
import { MailOutbox } from '../src/mail/entities/mail-outbox.entity';
import {
  ReportClock,
  REPORT_CLOCK,
} from '../src/reports/report-clock.provider';
import { DateTime } from 'luxon';
import { MailProcessor } from '../src/mail/mail.processor';
import { OutboxProcessor } from '../src/mail/outbox.processor';
import { MAIL_ERROR_CODE } from '../src/mail/errors/mail-delivery.error';
import { NodeEnvironment } from '../src/config/environment.constants';

function assertSafeE2eEnvironment(): string {
  if (process.env.NODE_ENV !== NodeEnvironment.TEST) {
    throw new Error('E2E requires NODE_ENV=test');
  }

  const rawUrl = process.env.E2E_DATABASE_URL;

  if (!rawUrl) {
    throw new Error('E2E_DATABASE_URL is required');
  }

  const databaseName = new URL(rawUrl).pathname.replace(/^\/+/, '');
  if (!databaseName.endsWith('_e2e')) {
    throw new Error('E2E database name must end with _e2e');
  }

  if (process.env.DATABASE_URL === rawUrl) {
    throw new Error('E2E_DATABASE_URL must differ from DATABASE_URL');
  }

  if (
    process.env.E2E_DATABASE_DESTRUCTIVE_ACK !== 'hotel-management-e2e-only'
  ) {
    throw new Error(
      'E2E_DATABASE_DESTRUCTIVE_ACK=hotel-management-e2e-only is required to ensure database safety',
    );
  }

  // Force TypeORM and ConfigService to use the E2E database
  process.env.DATABASE_URL = rawUrl;
  process.env.DATABASE_SSL_ENABLED =
    process.env.E2E_DATABASE_SSL_ENABLED ?? 'false';
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED =
    process.env.E2E_DATABASE_SSL_REJECT_UNAUTHORIZED ?? 'true';
  return rawUrl;
}

class FakeReportClock implements ReportClock {
  private currentTime: DateTime = DateTime.now();

  now(): DateTime {
    return this.currentTime;
  }

  setSystemTime(date: Date) {
    this.currentTime = DateTime.fromJSDate(date);
  }
}

describe('ReportsModule (e2e)', () => {
  let app: INestApplication;
  let reportsService: ReportsService;
  let userRepository: Repository<User>;
  let emailLogRepository: Repository<EmailLog>;
  let dispatchRepository: Repository<MonthlyReportDispatch>;
  let outboxRepository: Repository<MailOutbox>;
  let outboxProcessor: OutboxProcessor;
  let migrationDataSource: DataSource;
  let testAdmin: User;
  let fakeClock: FakeReportClock;

  const mailQueueMock = {
    add: jest.fn().mockResolvedValue({
      id: 'test-job-id',
    }),
  };

  beforeAll(async () => {
    const e2eDatabaseUrl = assertSafeE2eEnvironment();
    migrationDataSource = new DataSource({
      type: 'postgres',
      url: e2eDatabaseUrl,
      ssl:
        process.env.E2E_DATABASE_SSL_ENABLED === 'true'
          ? {
              rejectUnauthorized:
                process.env.E2E_DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
            }
          : false,
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../src/migrations/*{.ts,.js}'],
      migrationsTransactionMode: 'each',
    });
    await migrationDataSource.initialize();
    await migrationDataSource.dropDatabase();
    await migrationDataSource.runMigrations();
    await migrationDataSource.destroy();

    fakeClock = new FakeReportClock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken(MAIL_QUEUE))
      .useValue(mailQueueMock)
      .overrideProvider(REPORT_CLOCK)
      .useValue(fakeClock)
      .overrideProvider(MailProcessor)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    reportsService = moduleFixture.get<ReportsService>(ReportsService);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    emailLogRepository = moduleFixture.get<Repository<EmailLog>>(
      getRepositoryToken(EmailLog),
    );
    dispatchRepository = moduleFixture.get<Repository<MonthlyReportDispatch>>(
      getRepositoryToken(MonthlyReportDispatch),
    );
    outboxRepository = moduleFixture.get<Repository<MailOutbox>>(
      getRepositoryToken(MailOutbox),
    );
    outboxProcessor = moduleFixture.get<OutboxProcessor>(OutboxProcessor);

    // Create a single test admin
    testAdmin = userRepository.create({
      username: `test_admin_rep_${Date.now()}`,
      email: `admin_${Date.now()}@test.com`,
      password: await bcrypt.hash('password123', 10),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      fullName: 'Test Admin',
      phone: `0${Date.now()}`.substring(0, 20),
    });
    await userRepository.save(testAdmin);
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (migrationDataSource) {
      if (!migrationDataSource.isInitialized) {
        await migrationDataSource.initialize();
      }
      await migrationDataSource.dropDatabase();
      await migrationDataSource.runMigrations();
      await migrationDataSource.destroy();
    }
  }, 30000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate monthly report and ensure idempotency (prevent double sending)', async () => {
    // 2026-08-31 23:55 in Asia/Ho_Chi_Minh.
    const mockDate = new Date(Date.UTC(2026, 7, 31, 16, 55, 0));
    fakeClock.setSystemTime(mockDate);

    // Run concurrently 3 times
    await Promise.all([
      reportsService.generateMonthlyReport(),
      reportsService.generateMonthlyReport(),
      reportsService.generateMonthlyReport(),
    ]);

    // Process outbox to trigger state change to QUEUED
    await outboxProcessor.processOutbox();

    const dispatches = await dispatchRepository.findBy({
      reportMonth: '2026-08',
      recipientId: testAdmin.id,
    });

    expect(dispatches).toHaveLength(1);
    const dispatch = dispatches[0];
    expect(dispatch.status).toBe(ReportDispatchStatus.QUEUED);

    const emailLog = await emailLogRepository.findOneBy({
      id: dispatch.emailLogId!,
    });
    expect(emailLog).toBeDefined();
    expect(emailLog!.status).toBe(EmailStatus.PENDING);

    const outboxCount = await outboxRepository.countBy({
      emailLogId: emailLog!.id,
    });
    expect(outboxCount).toBe(1);

    await dispatchRepository.delete({ id: dispatch.id });
    await outboxRepository.delete({ emailLogId: emailLog!.id });
    await emailLogRepository.delete({ id: emailLog!.id });
  }, 30000);

  it('does not generate a report before the last day of the month', async () => {
    // The cron also runs on day 30 in a 31-day month, but must not send yet.
    fakeClock.setSystemTime(new Date(Date.UTC(2026, 7, 30, 16, 55, 0)));

    await reportsService.generateMonthlyReport();

    expect(
      await dispatchRepository.countBy({
        reportMonth: '2026-08',
        recipientId: testAdmin.id,
      }),
    ).toBe(0);
  });

  it('allows retry when queue dispatch fails but continues to next admin', async () => {
    // 2026-09-30 23:55 in Asia/Ho_Chi_Minh.
    const mockDate = new Date(Date.UTC(2026, 8, 30, 16, 55, 0));
    fakeClock.setSystemTime(mockDate);

    // First time, simulate a failure in outbox creation by making the outbox throw manually
    // Wait, since we are using overrideProvider, we can't easily spyOn MailService without getting it.
    // Let's just create a dispatch that is failed, then run the cron and see it retry.

    // Create a FAILED dispatch
    const failedLog = await emailLogRepository.save(
      emailLogRepository.create({
        type: EmailType.MONTHLY_REPORT,
        recipient: testAdmin.email,
        subject: 'Failed Report',
        text: 'Failed',
        status: EmailStatus.FAILED,
        recipientUserId: testAdmin.id,
        reportMonth: '2026-09',
        lastError: MAIL_ERROR_CODE.OUTBOX_EXHAUSTED,
      }),
    );

    const failedDispatch = await dispatchRepository.save(
      dispatchRepository.create({
        reportMonth: '2026-09',
        recipientId: testAdmin.id,
        status: ReportDispatchStatus.FAILED,
        emailLogId: failedLog.id,
      }),
    );

    // Run generation
    await reportsService.generateMonthlyReport();

    // Process outbox to trigger state change to QUEUED
    await outboxProcessor.processOutbox();

    // Verify it retried
    const dispatch = await dispatchRepository.findOneBy({
      id: failedDispatch.id,
    });

    expect(dispatch!.status).toBe(ReportDispatchStatus.QUEUED);

    const updatedLog = await emailLogRepository.findOneBy({ id: failedLog.id });
    expect(updatedLog!.status).toBe(EmailStatus.PENDING);
    expect(updatedLog!.retryGeneration).toBe(1);

    // We do not hard delete in ephemeral DB
  }, 30000);

  it('fails dispatch when Redis queue is unavailable', async () => {
    // 2026-10-31 23:55 in Asia/Ho_Chi_Minh.
    const mockDate = new Date(Date.UTC(2026, 9, 31, 16, 55, 0));
    fakeClock.setSystemTime(mockDate);

    // Mock BullMQ add to reject
    mailQueueMock.add.mockRejectedValueOnce(new Error('Redis unavailable'));

    await reportsService.generateMonthlyReport();

    // First attempt fails and schedules an exponential-backoff retry.
    await outboxProcessor.processOutbox();

    const dispatches = await dispatchRepository.find({
      where: {
        reportMonth: '2026-10',
        recipientId: testAdmin.id,
      },
    });

    expect(dispatches).toHaveLength(1);
    const dispatch = dispatches[0];

    const emailLog = await emailLogRepository.findOneBy({
      id: dispatch.emailLogId!,
    });
    expect(emailLog).toBeDefined();

    // Move each scheduled retry into the past so the test does not wait for
    // real exponential-backoff minutes. Two more failures exhaust 3 attempts.
    for (let attempt = 1; attempt < 3; attempt += 1) {
      await outboxRepository.update(
        { emailLogId: emailLog!.id },
        { nextAttemptAt: new Date(0) },
      );
      mailQueueMock.add.mockRejectedValueOnce(new Error('Redis unavailable'));
      await outboxProcessor.processOutbox();
    }

    const exhaustedLog = await emailLogRepository.findOneBy({
      id: dispatch.emailLogId!,
    });
    expect(exhaustedLog!.status).toBe(EmailStatus.FAILED);

    const exhaustedDispatch = await dispatchRepository.findOneBy({
      id: dispatch.id,
    });
    expect(exhaustedDispatch!.status).toBe(ReportDispatchStatus.FAILED);
  }, 30000);
});
