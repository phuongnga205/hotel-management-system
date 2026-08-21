import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { User, UserRole, UserStatus } from '../src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  EmailLog,
  EmailStatus,
  EmailType,
} from '../src/mail/entities/email-log.entity';
import * as bcrypt from 'bcrypt';

describe('Admin Email Logs (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let emailLogRepository: Repository<EmailLog>;
  let jwtService: JwtService;
  let adminToken: string;
  let userToken: string;
  let testAdmin: User;
  let testUser: User;
  let testEmailLog: EmailLog;

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

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    emailLogRepository = moduleFixture.get<Repository<EmailLog>>(
      getRepositoryToken(EmailLog),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test admin
    testAdmin = userRepository.create({
      username: `admin_emaillog_${Date.now()}`,
      email: `admin_log_${Date.now()}@hotel.com`,
      password: await bcrypt.hash('password123', 10),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      firstName: 'Admin',
      lastName: 'Test',
      phone: '0123456781',
    });
    await userRepository.save(testAdmin);
    adminToken = jwtService.sign({
      sub: testAdmin.id,
      email: testAdmin.email,
      role: testAdmin.role,
    });

    // Create test user
    testUser = userRepository.create({
      username: `user_emaillog_${Date.now()}`,
      email: `user_log_${Date.now()}@hotel.com`,
      password: await bcrypt.hash('password123', 10),
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      firstName: 'User',
      lastName: 'Test',
      phone: '0123456782',
    });
    await userRepository.save(testUser);
    userToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    if (testEmailLog) {
      await emailLogRepository?.delete({ id: testEmailLog.id });
    }
    if (testAdmin) {
      await userRepository?.delete({ id: testAdmin.id });
    }
    if (testUser) {
      await userRepository?.delete({ id: testUser.id });
    }
    await app?.close();
  });

  describe('GET /admin/email-logs', () => {
    it('should return 401 if unauthorized', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/email-logs')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 403 if user role is not admin', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/email-logs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return a paginated list of email logs for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/email-logs?limit=5&page=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      const body = response.body as { data: { items: unknown[] } };
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('items');
      expect(Array.isArray(body.data.items)).toBe(true);
    });
  });

  describe('POST /admin/email-logs/:id/retry', () => {
    it('should successfully retry a failed email', async () => {
      // Seed a failed email log
      const emailLog = emailLogRepository.create({
        type: EmailType.MONTHLY_REPORT,
        recipient: 'test_failed@hotel.com',
        status: EmailStatus.FAILED,
        lastError: 'Simulated failure',
      });
      testEmailLog = await emailLogRepository.save(emailLog);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/email-logs/${testEmailLog.id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.ACCEPTED);

      const body = response.body as { message: string };
      expect(body.message).toBeDefined();

      // Verify DB update
      const updatedLog = await emailLogRepository.findOneBy({
        id: testEmailLog.id,
      });
      expect(updatedLog?.status).toBe(EmailStatus.PENDING);
      expect(updatedLog?.lastError).toBeNull();

    });

    it('should reject retry for a non-failed email with 409 Conflict', async () => {
      const emailLog = emailLogRepository.create({
        type: EmailType.ACCOUNT_ACTIVATION,
        recipient: 'test_sent@hotel.com',
        status: EmailStatus.SENT,
      });
      const savedLog = await emailLogRepository.save(emailLog);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/email-logs/${savedLog.id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.CONFLICT);

      await emailLogRepository.delete({ id: savedLog.id });
    });
  });
});
