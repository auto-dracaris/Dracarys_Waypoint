import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { Activity } from '../../database/entities/activity.entity';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { SKIP_ACTIVITY_KEY } from '../decorators/skip-activity.decorator';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityInterceptor.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Also runs on RabbitMQ handlers (e.g. SmsConsumer), which have no HTTP request.
    if (context.getType() !== 'http') {
      return next.handle();
    }
    if (this.reflector.get(SKIP_ACTIVITY_KEY, context.getHandler())) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const response = http.getResponse<Response>();
    const user = request.user;

    if (user && MUTATING_METHODS.has(request.method)) {
      // Hooked to the response's `finish` event rather than an RxJS `tap`,
      // because an interceptor sees an exception before Nest's exception
      // filter has mapped it to a status code — `response.statusCode` isn't
      // final yet at that point.
      response.on('finish', () => {
        const activity = this.activityRepository.create({
          userId: user.userId,
          role: user.role,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
        });
        // Fire-and-forget, deliberately: a logging failure must never affect
        // the response already sent to the client.
        this.activityRepository.save(activity).catch((error: Error) => {
          this.logger.error(
            `Failed to record activity: ${error.message}`,
            error.stack,
          );
        });
      });
    }

    return next.handle();
  }
}
