import { SchedulerRegistry } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { RedisUtil } from '../token/redis.util';
import { EmailReconciliationService } from './email-reconciliation.service';
import { MAIL_RECONCILIATION } from './mail.constants';

describe('EmailReconciliationService', () => {
  const schedulerRegistry = {} as SchedulerRegistry;

  it('requeues a failed item and stops the current run', async () => {
    const redis = {
      rpop: jest.fn().mockResolvedValue('1'),
      lpush: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      transaction: jest.fn().mockRejectedValue(new Error('database down')),
    };
    const service = new EmailReconciliationService(
      redis as unknown as RedisUtil,
      dataSource as unknown as DataSource,
      schedulerRegistry,
    );

    await service.reconcileEmails();

    expect(redis.rpop).toHaveBeenCalledTimes(1);
    expect(redis.lpush).toHaveBeenCalledWith(
      MAIL_RECONCILIATION.QUEUE_KEY,
      '1',
    );
  });

  it('processes at most the configured batch size', async () => {
    const redis = {
      rpop: jest.fn().mockResolvedValue('1'),
      lpush: jest.fn(),
    };
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn((callback: (value: unknown) => unknown) =>
        Promise.resolve(callback(manager)),
      ),
    };
    const service = new EmailReconciliationService(
      redis as unknown as RedisUtil,
      dataSource as unknown as DataSource,
      schedulerRegistry,
    );

    await service.reconcileEmails();

    expect(redis.rpop).toHaveBeenCalledTimes(MAIL_RECONCILIATION.BATCH_SIZE);
    expect(redis.lpush).not.toHaveBeenCalled();
  });
});
