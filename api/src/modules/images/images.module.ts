import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { TripStop } from '../../database/entities/trip-stop.entity';
import { User } from '../../database/entities/user.entity';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { TripStopImagesRepository } from './repositories/trip-stop-images.repository';
import { UserImagesRepository } from './repositories/user-images.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, TripStop]), CloudinaryModule],
  controllers: [ImagesController],
  providers: [ImagesService, UserImagesRepository, TripStopImagesRepository],
  exports: [ImagesService],
})
export class ImagesModule {}
