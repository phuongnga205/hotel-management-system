import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TokenUtil } from '../token/token.util';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: TokenUtil,
          useValue: { revokeAuthToken: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { decode: jest.fn() },
        },
        {
          provide: I18nService,
          useValue: { t: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
