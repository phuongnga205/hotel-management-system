import { Test, TestingModule } from '@nestjs/testing';
import { MailProcessor, SendMailJobData } from './mail.processor';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { DataSource, Repository } from 'typeorm';
import { MailErrorSanitizer } from './mail-error.sanitizer';
import { RedisUtil } from '../token/redis.util';
import { MailDeliveryError } from './errors/mail-delivery.error';
import { MAIL_RECONCILIATION } from './mail.constants';
import { Job } from 'bullmq';

describe('MailProcessor', () => {
  let processor: MailProcessor;
  let dataSourceMock: Record<string, jest.Mock>;
  let emailLogRepoMock: Record<string, jest.Mock>;
  let mailErrorSanitizerMock: Record<string, jest.Mock>;
  let redisUtilMock: Record<string, jest.Mock>;
  let configServiceMock: Record<string, jest.Mock>;
  let managerMock: Record<string, jest.Mock>;

  const originalFetch = global.fetch;

  beforeEach(async () => {
    managerMock = {
      update: jest.fn(),
    };

    dataSourceMock = {
      transaction: jest
        .fn()
        .mockImplementation((cb: (manager: unknown) => unknown) =>
          cb(managerMock),
        ),
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
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: getRepositoryToken(EmailLog),
          useValue: emailLogRepoMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: MailErrorSanitizer,
          useValue: mailErrorSanitizerMock,
        },
        { provide: RedisUtil, useValue: redisUtilMock },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const createJobMock = (
    data: Record<string, unknown> = {},
    attemptsMade = 0,
    maxAttempts = 3,
  ): Job<SendMailJobData> => {
    return {
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
    } as unknown as Job<SendMailJobData>;
  };

  it('should send email via Brevo and update status to SENT', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ messageId: '<brevo-msg-123>' }),
    });

    const job = createJobMock();
    const result = await processor.process(job);

    expect(result).toBe('<brevo-msg-123>');

    // Check fetch mock calls details manually to be completely type-safe
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchMock = global.fetch as jest.MockedFunction<typeof global.fetch>;
    const callArgs = fetchMock.mock.calls[0];

    expect(callArgs[0]).toBe('https://api.brevo.com/v3/smtp/email');

    const init = callArgs[1] as RequestInit;
    expect(init.method).toBe('POST');

    const headers = init.headers as Record<string, string>;
    expect(headers['api-key']).toBe('xkeysib-test-key');
    expect(headers['content-type']).toBe('application/json');

    if (typeof init.body === 'string') {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      const bodyHeaders = body.headers as Record<string, string>;
      expect(bodyHeaders['X-Idempotency-Key']).toBe(
        'email/test-email-log-id/1',
      );
    }

    // Check managerMock calls manually to be type-safe without expect.any(Date)
    expect(managerMock.update).toHaveBeenCalledTimes(2);
    const updateCall = managerMock.update.mock.calls[0] as unknown[];
    expect(updateCall[0]).toBe(EmailLog);
    expect(updateCall[1]).toEqual({ id: 'test-email-log-id' });

    const updateData = updateCall[2] as Partial<EmailLog>;
    expect(updateData.status).toBe(EmailStatus.SENT);
    expect(updateData.sentAt).toBeInstanceOf(Date);
    expect(updateData.lastError).toBeNull();
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

    const job = createJobMock({}, 2, 3);
    await expect(processor.process(job)).rejects.toThrow(MailDeliveryError);

    expect(managerMock.update).toHaveBeenCalledTimes(2);
    const updateCall = managerMock.update.mock.calls[0] as unknown[];
    expect(updateCall[0]).toBe(EmailLog);
    expect(updateCall[1]).toEqual({ id: 'test-email-log-id' });

    const updateData = updateCall[2] as Partial<EmailLog>;
    expect(updateData.status).toBe(EmailStatus.FAILED);
    expect(updateData.lastError).toBe('MOCKED_ERROR_CODE');
  });

  it('should push to reconciliation queue if DB update fails after sending', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ messageId: '<brevo-msg-456>' }),
    });

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
          badConfigMock as unknown as ConfigService,
          emailLogRepoMock as unknown as Repository<EmailLog>,
          dataSourceMock as unknown as DataSource,
          mailErrorSanitizerMock as unknown as MailErrorSanitizer,
          redisUtilMock as unknown as RedisUtil,
        ),
    ).toThrow('Missing environment variable: BREVO_API_KEY');
  });
});
