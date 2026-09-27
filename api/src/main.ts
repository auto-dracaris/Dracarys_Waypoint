import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import morgan from 'morgan';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

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

  await app.listen(process.env.PORT ?? 5000);
}
void bootstrap();
