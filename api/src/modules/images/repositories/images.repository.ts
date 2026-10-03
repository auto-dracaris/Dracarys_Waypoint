import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from '../../../database/entities/image.entity';

@Injectable()
export class ImagesRepository {
  constructor(
    @InjectRepository(Image)
    private readonly repo: Repository<Image>,
  ) {}

  save(image: Image): Promise<Image> {
    return this.repo.save(image);
  }

  findById(id: string): Promise<Image | null> {
    return this.repo.findOne({ where: { id } });
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id).then(() => undefined);
  }
}
