import { Test, TestingModule } from '@nestjs/testing';
import { MailProcessor } from './mail.processor';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { DataSource } from 'typeorm';
import { MailErrorSanitizer } from './mail-error.sanitizer';
import { RedisUtil } from '../token/redis.util';
import { MailDeliveryError } from './errors/mail-delivery.error';
import { MAIL_RECONCILIATION } from './mail.constants';

describe('MailProcessor', () => {
  let processor: MailProcessor;
  let dataSourceMock: any;
  let emailLogRepoMock: any;
  let mailErrorSanitizerMock: any;
  let redisUtilMock: any;
  let configServiceMock: any;
  let managerMock: any;

  const originalFetch = global.fetch;

  beforeEach(async () => {
    managerMock = {
      update: jest.fn(),
    };

    dataSourceMock = {
      transaction: jest.fn().mockImplementation((cb) => cb(managerMock)),
    };

    emailLogRepoMock = {
      update: jest.fn(),
    };

    mailErrorSanitizerMock = {
      toPublicCode: jest.fn().mockReturnValue('MOCKED_ERROR_CODE'),
    };

    redisUtilMock = {
      lpush: jest.fn(),
    };

    configServiceMock = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'BREVO_API_KEY') return 'xkeysib-test-key';
        if (key === 'MAIL_FROM')
          return 'Hotel Management System <hotel.management.2vnq@gmail.com>';
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProcessor,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: getRepositoryToken(EmailLog), useValue: emailLogRepoMock },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: MailErrorSanitizer, useValue: mailErrorSanitizerMock },
        { provide: RedisUtil, useValue: redisUtilMock },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const createJobMock = (
    data: any = {},
    attemptsMade = 0,
    maxAttempts = 3,
  ): any => ({
    data: {
      emailLogId: 'test-email-log-id',
      retryGeneration: 1,
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test text',
      html: '<p>Test html</p>',
      ...data,
    },
    attemptsMade,
    opts: { attempts: maxAttempts },
  });

  it('should send email via Brevo and update status to SENT', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ messageId: '<brevo-msg-123>' }),
    });

    const job = createJobMock();
    const result = await processor.process(job);

    expect(result).toBe('<brevo-msg-123>');

    // Verify fetch was called with correct Brevo payload
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'api-key': 'xkeysib-test-key',
          'content-type': 'application/json',
        }),
      }),
    );

    // Verify idempotency key in the body
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.headers['X-Idempotency-Key']).toBe(
      'email/test-email-log-id/1',
    );

    expect(managerMock.update).toHaveBeenCalledWith(
      EmailLog,
      { id: 'test-email-log-id' },
      {
        status: EmailStatus.SENT,
        sentAt: expect.any(Date),
        lastError: null,
      },
    );
  });

  it('should throw MailDeliveryError when Brevo returns HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          code: 'unauthorized',
          message: 'Key is missing or invalid',
        }),
    });

    const job = createJobMock();
    await expect(processor.process(job)).rejects.toThrow(MailDeliveryError);
    expect(mailErrorSanitizerMock.toPublicCode).toHaveBeenCalled();
  });

  it('should throw MailDeliveryError when fetch throws a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNRESET'));

    const job = createJobMock();
    await expect(processor.process(job)).rejects.toThrow(MailDeliveryError);
    expect(mailErrorSanitizerMock.toPublicCode).toHaveBeenCalledWith(
      expect.any(Error),
    );
  });

  it('should update status to FAILED on final attempt', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          code: 'internal_error',
          message: 'Internal server error',
        }),
    });

    // attemptsMade = 2 means this is the 3rd (and final) attempt
    const job = createJobMock({}, 2, 3);
    await expect(processor.process(job)).rejects.toThrow(MailDeliveryError);

    expect(managerMock.update).toHaveBeenCalledWith(
      EmailLog,
      { id: 'test-email-log-id' },
      {
        status: EmailStatus.FAILED,
        lastError: 'MOCKED_ERROR_CODE',
      },
    );
  });

  it('should push to reconciliation queue if DB update fails after sending', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ messageId: '<brevo-msg-456>' }),
    });

    // First call to dataSource.transaction (for marking SENT) will fail
    dataSourceMock.transaction.mockRejectedValueOnce(
      new Error('DB connection lost'),
    );

    const job = createJobMock();
    const result = await processor.process(job);

    expect(result).toBe('<brevo-msg-456>');
    expect(redisUtilMock.lpush).toHaveBeenCalledWith(
      MAIL_RECONCILIATION.QUEUE_KEY,
      'test-email-log-id',
    );
  });

  it('should fail-fast when BREVO_API_KEY is missing', () => {
    const badConfigMock = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'BREVO_API_KEY')
          throw new Error('Missing environment variable: BREVO_API_KEY');
        return '';
      }),
    };

    expect(
      () =>
        new MailProcessor(
          badConfigMock as any,
          emailLogRepoMock,
          dataSourceMock,
          mailErrorSanitizerMock,
          redisUtilMock,
        ),
    ).toThrow('Missing environment variable: BREVO_API_KEY');
  });
});
