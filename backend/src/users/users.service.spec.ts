import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { I18nService } from 'nestjs-i18n';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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
