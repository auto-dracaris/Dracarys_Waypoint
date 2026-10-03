import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Image } from '../../../database/entities/image.entity';

@Injectable()
export class ImagesRepository extends BaseRepository<Image> {
  constructor(
    @InjectRepository(Image)
    repository: Repository<Image>,
  ) {
    super(repository);
  }

  async remove(image: Image): Promise<void> {
    await this.repository.remove(image);
  }
}
