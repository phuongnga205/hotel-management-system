import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ReportsService } from '../src/reports/reports.service';
import { MailService } from '../src/mail/mail.service';
import { User, UserRole, UserStatus } from '../src/users/entities/user.entity';
import { EmailLog, EmailType } from '../src/mail/entities/email-log.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('ReportsModule (e2e)', () => {
  let app: INestApplication;
  let reportsService: ReportsService;
  let mailService: MailService;
  let userRepository: Repository<User>;
  let emailLogRepository: Repository<EmailLog>;
  let testAdmin: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const configService = moduleFixture.get<ConfigService>(ConfigService);
    if (configService.get('NODE_ENV') !== 'test') {
      throw new Error('E2E tests require NODE_ENV=test');
    }
    const dbUrl = String(configService.get('DATABASE_URL') || '');
    if (!dbUrl.includes('_test')) {
      throw new Error('E2E tests require an isolated test database');
    }

    reportsService = moduleFixture.get<ReportsService>(ReportsService);
    mailService = moduleFixture.get<MailService>(MailService);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    emailLogRepository = moduleFixture.get<Repository<EmailLog>>(
      getRepositoryToken(EmailLog),
    );

    // Create a test admin
    testAdmin = userRepository.create({
      username: `test_admin_rep_${Date.now()}`,
      email: `admin_${Date.now()}@test.com`,
      password: await bcrypt.hash('password123', 10),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      fullName: 'Test Admin',
      phone: '0123456789',
    });
    await userRepository.save(testAdmin);
  });

  afterAll(async () => {
    // Cleanup
    if (testAdmin) {
      await emailLogRepository?.delete({ recipient: testAdmin.email });
      await userRepository?.delete({ id: testAdmin.id });
    }
    await app?.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should generate monthly report and ensure idempotency (prevent double sending)', async () => {
    // Mock date to last day of month
    const mockDate = new Date(2026, 7, 31, 23, 55, 0); // Aug 31, 2026
    jest
      .useFakeTimers({
        doNotFake: [
          'nextTick',
          'setImmediate',
          'clearImmediate',
          'setInterval',
          'clearInterval',
          'setTimeout',
          'clearTimeout',
        ],
      })
      .setSystemTime(mockDate);

    // Mock MailService so NO real emails are queued
    const createEmailLogSpy = jest.spyOn(mailService, 'createEmailLog');
    jest.spyOn(mailService, 'enqueueEmail').mockResolvedValue();

    // Run concurrently 3 times
    await Promise.all([
      reportsService.generateMonthlyReport(),
      reportsService.generateMonthlyReport(),
      reportsService.generateMonthlyReport(),
    ]);

    const activeAdminsCount = await userRepository.countBy({
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    // Each admin should be queued exactly once
    expect(createEmailLogSpy).toHaveBeenCalledTimes(activeAdminsCount);

    const reportLogs = await emailLogRepository.find({
      where: { type: EmailType.MONTHLY_REPORT },
    });
    expect(
      reportLogs.filter((log) => log.subject?.includes('2026-08')).length,
    ).toBe(activeAdminsCount);
  });

  it('allows retry when queue dispatch fails but continues to next admin', async () => {
    const mockDate = new Date(2026, 8, 30, 23, 55, 0); // Sep 30, 2026
    jest
      .useFakeTimers({
        doNotFake: [
          'nextTick',
          'setImmediate',
          'clearImmediate',
          'setInterval',
          'clearInterval',
          'setTimeout',
          'clearTimeout',
        ],
      })
      .setSystemTime(mockDate);

    // Fail first attempt, succeed next
    let calls = 0;
    jest.spyOn(mailService, 'createEmailLog');
    jest.spyOn(mailService, 'enqueueEmail').mockImplementation(async () => {
      calls++;
      if (calls === 1) throw new Error('Queue failed');
    });

    // Ensure clean state
    await emailLogRepository.delete({
      type: EmailType.MONTHLY_REPORT,
      subject: 'Monthly report - 2026-09',
    });

    // 1st run: fails on 1st admin, succeeds on rest
    await reportsService.generateMonthlyReport();

    // 2nd run: should only attempt the 1st admin again
    const callsBefore = calls;
    await reportsService.generateMonthlyReport();

    expect(calls - callsBefore).toBe(1);

    // Cleanup
    await emailLogRepository.delete({
      type: EmailType.MONTHLY_REPORT,
      subject: 'Monthly report - 2026-09',
    });
  });
});
