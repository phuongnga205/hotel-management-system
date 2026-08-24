import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const paymentsService = {
    findAllForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findMine to paymentsService.findAllForUser, scoped bằng userId từ JWT', () => {
    const query = { page: 1, limit: 10 };
    void controller.findMine('42', query);
    expect(paymentsService.findAllForUser).toHaveBeenCalledWith('42', query);
  });
});
