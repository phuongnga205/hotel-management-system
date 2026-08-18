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

@Catch(QueryFailedError)
export class RoomPersistenceExceptionFilter implements ExceptionFilter<QueryFailedError> {
  constructor(
    private readonly i18n: I18nService,
    private readonly logger: RoomsLogger,
  ) {}

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const driverError = exception.driverError as { code?: string };

    if (driverError.code === PostgresErrorCode.UNIQUE_VIOLATION) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: this.i18n.t('messages.ROOM_NUMBER_EXISTS'),
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
      message: this.i18n.t('messages.ROOM_SAVE_FAILED'),
    });
  }
}
