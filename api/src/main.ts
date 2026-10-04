import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import morgan from 'morgan';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  buildRmqConsumerOptions,
  locationQueue,
  notificationQueue,
  smsQueue,
} from './common/rmq/rmq.options';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // `synchronize` builds the schema during app creation above; the seed
  // migrations must run after that (TypeORM's own `migrationsRun` option runs
  // migrations before `synchronize`, which fails since the tables don't exist
  // yet).
  await app.get(DataSource).runMigrations();

  app.use(morgan('dev'));

  // One prefix for the whole API — controllers declare `@Controller('auth')`,
  // never `@Controller('api/auth')`.
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors();

  const configService = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>(
    buildRmqConsumerOptions(configService, smsQueue(configService), 5),
  );
  // Its own queue: an SMS handler sleeps through its retries, which would hold
  // up position fixes waiting behind it.
  app.connectMicroservice<MicroserviceOptions>(
    buildRmqConsumerOptions(configService, locationQueue(configService), 20),
  );
  app.connectMicroservice<MicroserviceOptions>(
    buildRmqConsumerOptions(
      configService,
      notificationQueue(configService),
      10,
    ),
  );
  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? 5000);
}
void bootstrap();
