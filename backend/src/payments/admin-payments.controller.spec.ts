import { Test, TestingModule } from '@nestjs/testing';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentsService } from './payments.service';

describe('AdminPaymentsController', () => {
  let controller: AdminPaymentsController;
  const paymentsService = {
    findAllForAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    }).compile();

    controller = module.get<AdminPaymentsController>(AdminPaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll to paymentsService.findAllForAdmin', () => {
    const query = { page: 1, limit: 10 };
    void controller.findAll(query);
    expect(paymentsService.findAllForAdmin).toHaveBeenCalledWith(query);
  });
});
