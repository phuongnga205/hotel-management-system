import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { changePassword: jest.Mock };

  beforeEach(async () => {
    usersService = { changePassword: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('changePassword() should call UsersService.changePassword with the userId from JWT, not from body', async () => {
    const userId = '42';
    const dto = { currentPassword: 'old', newPassword: 'new123' };
    usersService.changePassword.mockResolvedValue({ message: 'ok' });

    const result = await controller.changePassword(userId, dto);

    expect(usersService.changePassword).toHaveBeenCalledWith(userId, dto);
    expect(result).toEqual({ message: 'ok' });
  });
});
