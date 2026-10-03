import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { Image } from '../../database/entities/image.entity';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { ImagesRepository } from './repositories/images.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Image]), CloudinaryModule],
  controllers: [ImagesController],
  providers: [ImagesService, ImagesRepository],
  exports: [ImagesService],
})
export class ImagesModule {}
