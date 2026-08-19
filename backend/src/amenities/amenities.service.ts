import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, Repository } from 'typeorm';
import { AmenityResponseDto } from './dto/amenity-response.dto';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { ListAmenitiesDto } from './dto/list-amenities.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { Amenity } from './entities/amenity.entity';
import { PostgresErrorCode } from '../common/enums/postgres-error-code.enum';
import { AMENITY_DATABASE_CONSTRAINT } from './amenity.constants';

const DEFAULT_AMENITY_TAKE = 50;
const DEFAULT_AMENITY_SKIP = 0;

@Injectable()
export class AmenitiesService {
  constructor(
    @InjectRepository(Amenity)
    private readonly repository: Repository<Amenity>,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateAmenityDto): Promise<AmenityResponseDto> {
    if (await this.repository.existsBy({ name: dto.name })) {
      throw new ConflictException(this.i18n.t('messages.AMENITY.NAME_EXISTS'));
    }
    return this.saveWithConflictHandling(this.repository.create(dto));
  }

  async findAll(query: ListAmenitiesDto): Promise<{
    data: AmenityResponseDto[];
    total: number;
    skip: number;
    take: number;
  }> {
    const skip = query.skip ?? DEFAULT_AMENITY_SKIP;
    const take = query.take ?? DEFAULT_AMENITY_TAKE;
    const [amenities, total] = await this.repository.findAndCount({
      order: { id: 'ASC' },
      skip,
      take,
    });
    return {
      data: amenities.map((amenity) => this.toResponse(amenity)),
      total,
      skip,
      take,
    };
  }

  async findOne(id: string): Promise<AmenityResponseDto> {
    const amenity = await this.repository.findOneBy({ id });
    if (!amenity) throw this.notFoundException();
    return this.toResponse(amenity);
  }

  async update(id: string, dto: UpdateAmenityDto): Promise<AmenityResponseDto> {
    const amenity = await this.repository.preload({ id, ...dto });
    if (!amenity) throw this.notFoundException();
    return this.saveWithConflictHandling(amenity);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const result = await this.repository.softDelete(id);
    if (!result.affected) throw this.notFoundException();
    return { deleted: true };
  }

  private toResponse(amenity: Amenity): AmenityResponseDto {
    return plainToInstance(AmenityResponseDto, amenity, {
      excludeExtraneousValues: true,
    });
  }

  private notFoundException(): NotFoundException {
    return new NotFoundException(this.i18n.t('messages.AMENITY.NOT_FOUND'));
  }

  private async saveWithConflictHandling(
    amenity: Amenity,
  ): Promise<AmenityResponseDto> {
    try {
      return this.toResponse(await this.repository.save(amenity));
    } catch (error: unknown) {
      if (this.isAmenityNameConflict(error)) {
        throw new ConflictException(
          this.i18n.t('messages.AMENITY.NAME_EXISTS'),
        );
      }
      throw error;
    }
  }

  private isAmenityNameConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };
    return (
      driverError.code === PostgresErrorCode.UNIQUE_VIOLATION &&
      driverError.constraint === AMENITY_DATABASE_CONSTRAINT.NAME_UNIQUE
    );
  }
}
