import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsExportService } from './rooms-export.service';
import { I18nService } from 'nestjs-i18n';
import { RoomsLogger } from './rooms.logger';

describe('RoomsController', () => {
  let controller: RoomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: {},
        },
        {
          provide: RoomsExportService,
          useValue: {},
        },
        {
          provide: I18nService,
          useValue: { t: jest.fn() },
        },
        {
          provide: RoomsLogger,
          useValue: { error: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
