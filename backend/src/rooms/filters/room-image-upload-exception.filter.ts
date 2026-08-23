import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';
import { I18nService } from 'nestjs-i18n';

const MULTER_FILE_SIZE_ERROR_CODE = 'LIMIT_FILE_SIZE';

@Catch(MulterError)
export class RoomImageUploadExceptionFilter implements ExceptionFilter<MulterError> {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isFileTooLarge = exception.code === MULTER_FILE_SIZE_ERROR_CODE;
    const statusCode = isFileTooLarge
      ? HttpStatus.PAYLOAD_TOO_LARGE
      : HttpStatus.BAD_REQUEST;
    const messageKey = isFileTooLarge
      ? 'messages.ROOM.IMAGE_TOO_LARGE'
      : 'messages.ROOM.IMAGE_UPLOAD_FAILED';

    response.status(statusCode).json({
      statusCode,
      message: this.i18n.t(messageKey),
    });
  }
}
