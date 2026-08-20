import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import { PostgresErrorCode } from '../../common/enums/postgres-error-code.enum';
import { RoomsLogger } from '../rooms.logger';
import { ROOM_DATABASE_CONSTRAINT } from '../constants/room-database.constants';

@Catch(QueryFailedError)
export class RoomPersistenceExceptionFilter implements ExceptionFilter<QueryFailedError> {
  constructor(
    private readonly i18n: I18nService,
    private readonly logger: RoomsLogger,
  ) {}

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const driverError = exception.driverError as {
      code?: string;
      constraint?: string;
    };

    if (
      driverError.code === PostgresErrorCode.UNIQUE_VIOLATION &&
      driverError.constraint === ROOM_DATABASE_CONSTRAINT.NUMBER_UNIQUE
    ) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: this.i18n.t('messages.ROOM.NUMBER_EXISTS'),
      });
      return;
    }

    if (
      driverError.code === PostgresErrorCode.UNIQUE_VIOLATION &&
      driverError.constraint === ROOM_DATABASE_CONSTRAINT.ONE_THUMBNAIL_PER_ROOM
    ) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: this.i18n.t('messages.ROOM.THUMBNAIL_EXISTS'),
      });
      return;
    }

    this.logger.error({
      message:
        'Room persistence failed; verify database availability and migration state',
      error: exception,
    });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.i18n.t('messages.ROOM.SAVE_FAILED'),
    });
  }
}
