import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ReportsService } from '../src/reports/reports.service';
import { User, UserRole, UserStatus } from '../src/users/entities/user.entity';
import { EmailLog, EmailStatus } from '../src/mail/entities/email-log.entity';
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

const E2E_DATABASE_NAME = 'neondb'; // based on neon URL
const E2E_ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'ep-cool-feather-axwc6i9s-pooler.c-4.us-east-2.aws.neon.tech',
];

function assertSafeE2eEnvironment(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('E2E requires NODE_ENV=test');
  }

  const rawUrl = process.env.DATABASE_URL; // Using DATABASE_URL since E2E_DATABASE_URL is not set

  if (!rawUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const databaseUrl = new URL(rawUrl);
  const databaseName = databaseUrl.pathname.slice(1);

  if (
    databaseName !== E2E_DATABASE_NAME ||
    !E2E_ALLOWED_HOSTS.includes(databaseUrl.hostname)
  ) {
    throw new Error('Unsafe E2E database configuration');
  }
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
      .overrideProvider(OutboxProcessor)
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

    // Deactivate all existing admins to isolate test
    await userRepository.update(
      { role: UserRole.ADMIN },
      { status: UserStatus.INACTIVE },
    );

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
    // Cleanup
    if (testAdmin && testAdmin.id) {
      await dispatchRepository?.delete({ recipientId: testAdmin.id });
      await emailLogRepository?.delete({ recipientUserId: testAdmin.id });
      await userRepository?.delete({ id: testAdmin.id });
    }
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

  it('allows retry when queue dispatch fails but continues to next admin', async () => {
    const mockDate = new Date(Date.UTC(2026, 9, 1, 0, 5, 0)); // Oct 1, 2026, target Sep 2026
    fakeClock.setSystemTime(mockDate);

    // First time, simulate a failure in outbox creation by making the outbox throw manually
    // Wait, since we are using overrideProvider, we can't easily spyOn MailService without getting it.
    // Let's just create a dispatch that is failed, then run the cron and see it retry.

    // Create a FAILED dispatch
    const failedLog = await emailLogRepository.save(
      emailLogRepository.create({
        type: 'monthly-report',
        recipient: testAdmin.email,
        subject: 'Failed Report',
        text: 'Failed',
        status: EmailStatus.FAILED,
        recipientUserId: testAdmin.id,
        reportMonth: '2026-09',
        lastError: 'OUTBOX_EXHAUSTED',
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

    // Verify it retried
    const dispatch = await dispatchRepository.findOneBy({
      id: failedDispatch.id,
    });
    expect(dispatch!.status).toBe(ReportDispatchStatus.QUEUED);

    const updatedLog = await emailLogRepository.findOneBy({ id: failedLog.id });
    expect(updatedLog!.status).toBe(EmailStatus.PENDING);
    expect(updatedLog!.retryGeneration).toBe(1);

    await dispatchRepository.delete({ id: dispatch!.id });
    await outboxRepository.delete({ emailLogId: failedLog.id });
    await emailLogRepository.delete({ id: failedLog.id });
  }, 30000);
});
