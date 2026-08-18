import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AppEvent } from '../common/events/event-names.constants';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: { findOneBy: jest.Mock; save: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('changePassword', () => {
    const userId = '1';
    const dto = { currentPassword: 'oldPass', newPassword: 'newPass123' };
    const mockUser = {
      id: userId,
      email: 'test@mail.com',
      username: 'test',
      password: 'oldHashedPass',
    };

    it('should update the password and emit PasswordChanged on success', async () => {
      userRepository.findOneBy.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPass');

      const result = await service.changePassword(userId, dto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.currentPassword,
        mockUser.password,
      );
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'newHashedPass' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AppEvent.PASSWORD_CHANGED,
        expect.objectContaining({
          userId,
          email: mockUser.email,
          username: mockUser.username,
        }),
      );
      expect(result.message).toEqual('messages.USERS.CHANGE_PASSWORD_SUCCESS');
    });

    it('should throw NotFoundException if the user no longer exists', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if the current password is wrong', async () => {
      userRepository.findOneBy.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
