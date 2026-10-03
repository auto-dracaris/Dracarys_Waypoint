import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Image } from '../../database/entities/image.entity';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { ImagesRepository } from './repositories/images.repository';

// No AuthModule import: `JwtAuthGuard` only needs the strategy AuthModule
// registers globally with passport, and staying free of it lets AuthModule
// import this module for avatars.
@Module({
  imports: [TypeOrmModule.forFeature([Image])],
  controllers: [ImagesController],
  providers: [ImagesService, ImagesRepository],
  exports: [ImagesService],
})
export class ImagesModule {}
