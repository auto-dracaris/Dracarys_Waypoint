import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';

/**
 * `@Catch()` with no argument, so this handles every thrown value — not just
 * HttpException — and forces all of them into `ApiResponseDto`. A client
 * therefore never has to parse two different error shapes.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let data: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as any;

        // ValidationPipe hands us an array of messages.
        if (Array.isArray(resObj.message)) {
          message = resObj.message[0]; // surface the first one
          data = resObj.message; // keep the full set for debugging
        } else if (resObj.message) {
          message = resObj.message;
          // A service may attach `data` to an error — e.g. the current trip
          // on a 409, so a handset can reconcile with it.
          data = resObj.data ?? null;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = new ApiResponseDto(status, message, data);
    response.status(status).json(errorResponse);
  }
}
