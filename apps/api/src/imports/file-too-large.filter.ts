import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MAX_FILE_SIZE } from './imports.service.js';

/** Traduce el error de tamaño de Multer a un mensaje en español con el límite. */
@Catch(PayloadTooLargeException)
export class FileTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(413)
      .json({
        statusCode: 413,
        error: 'Payload Too Large',
        message: `El archivo supera el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      });
  }
}
