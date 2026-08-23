import { Test, TestingModule } from '@nestjs/testing';
import { AmenitiesService } from './amenities.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Amenity } from './entities/amenity.entity';
import { I18nService } from 'nestjs-i18n';

describe('AmenitiesService', () => {
  let service: AmenitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmenitiesService,
        { provide: getRepositoryToken(Amenity), useValue: {} },
        { provide: I18nService, useValue: { t: jest.fn() } },
      ],
    }).compile();

    service = module.get<AmenitiesService>(AmenitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
