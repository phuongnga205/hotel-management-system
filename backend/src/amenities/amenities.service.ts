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

@Injectable()
export class AmenitiesService {
  constructor(
    @InjectRepository(Amenity)
    private readonly repository: Repository<Amenity>,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateAmenityDto) {
    if (await this.repository.existsBy({ name: dto.name })) {
      throw new ConflictException(this.i18n.t('messages.AMENITY.NAME_EXISTS'));
    }
    const savedAmenity = await this.saveWithConflictHandling(
      this.repository.create(dto),
    );

    return {
      statusCode: 201,
      message: this.i18n.t('messages.AMENITY.CREATE_SUCCESS'),
      data: this.toResponse(savedAmenity),
    };
  }

  async findAll(query: ListAmenitiesDto) {
    const { page, limit } = query;
    const [amenities, total] = await this.repository.findAndCount({
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      statusCode: 200,
      message: this.i18n.t('messages.AMENITY.FIND_ALL_SUCCESS'),
      data: {
        items: amenities.map((amenity) => this.toResponse(amenity)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const amenity = await this.repository.findOneBy({ id });
    if (!amenity) throw this.notFoundException();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.AMENITY.FIND_ONE_SUCCESS'),
      data: this.toResponse(amenity),
    };
  }

  async update(id: string, dto: UpdateAmenityDto) {
    const amenity = await this.repository.preload({ id, ...dto });
    if (!amenity) throw this.notFoundException();
    const savedAmenity = await this.saveWithConflictHandling(amenity);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.AMENITY.UPDATE_SUCCESS'),
      data: this.toResponse(savedAmenity),
    };
  }

  async remove(id: string) {
    const result = await this.repository.softDelete(id);
    if (!result.affected) throw this.notFoundException();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.AMENITY.REMOVE_SUCCESS'),
    };
  }

  private toResponse(amenity: Amenity): AmenityResponseDto {
    return plainToInstance(AmenityResponseDto, amenity, {
      excludeExtraneousValues: true,
    });
  }

  private notFoundException(): NotFoundException {
    return new NotFoundException(this.i18n.t('messages.AMENITY.NOT_FOUND'));
  }

  private async saveWithConflictHandling(amenity: Amenity): Promise<Amenity> {
    try {
      return await this.repository.save(amenity);
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
