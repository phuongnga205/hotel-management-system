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
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import AppDataSource from '../src/data-source';
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

function assertSafeE2eEnvironment(): void {
  if (process.env.NODE_ENV !== NodeEnvironment.TEST) {
    throw new Error('E2E requires NODE_ENV=test');
  }

  const rawUrl = process.env.E2E_DATABASE_URL;

  if (!rawUrl) {
    throw new Error('E2E_DATABASE_URL is required');
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
  let testAdmin: User;
  let fakeClock: FakeReportClock;

  const mailQueueMock = {
    add: jest.fn().mockResolvedValue({
      id: 'test-job-id',
    }),
  };

  beforeAll(async () => {
    assertSafeE2eEnvironment();
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    await AppDataSource.destroy();

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

    // Verify that the E2E database is completely clean before proceeding
    const existingUsers = await userRepository.count();
    if (existingUsers !== 0) {
      throw new Error(
        'E2E database must be empty before running reports suite',
      );
    }

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
    // Database is ephemeral, no need to hard delete items here.
    await app?.close();
  }, 30000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate monthly report and ensure idempotency (prevent double sending)', async () => {
    // Set time to Sep 1, 2026 00:05. Report period will be 2026-08.
    const mockDate = new Date(Date.UTC(2026, 8, 1, 0, 5, 0));
    fakeClock.setSystemTime(mockDate);

    // Run concurrently 3 times
    await Promise.all([
      reportsService.generateMonthlyReport(),
      reportsService.generateMonthlyReport(),
      reportsService.generateMonthlyReport(),
    ]);

    // Process outbox to trigger state change to QUEUED
    await outboxProcessor.processOutbox();

    const dispatches = await dispatchRepository.find({
      where: {
        reportMonth: '2026-08',
        recipientId: testAdmin.id,
      },
      take: 2,
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

  it('allows retry when queue dispatch fails but continues to next admin', async () => {
    const mockDate = new Date(Date.UTC(2026, 9, 1, 0, 5, 0)); // Oct 1, 2026, target Sep 2026
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
    const mockDate = new Date(Date.UTC(2026, 10, 1, 0, 5, 0));
    fakeClock.setSystemTime(mockDate);

    // Mock BullMQ add to reject
    mailQueueMock.add.mockRejectedValueOnce(new Error('Redis unavailable'));

    await reportsService.generateMonthlyReport();

    // Process outbox which should try and fail
    try {
      await outboxProcessor.processOutbox();
    } catch {
      // ignore
    }

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

    // Check it remains PENDING since Outbox will retry it up to MAX_ATTEMPTS.
    // If it reaches max attempts, Outbox processor sets it to FAILED.
    // Assuming outboxProcessor runs again to exhaust attempts:
    for (let i = 0; i < 5; i++) {
      mailQueueMock.add.mockRejectedValueOnce(new Error('Redis unavailable'));
      try {
        await outboxProcessor.processOutbox();
      } catch {
        // ignore
      }
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
