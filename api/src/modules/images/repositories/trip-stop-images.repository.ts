import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { TripStop } from '../../../database/entities/trip-stop.entity';

@Injectable()
export class TripStopImagesRepository extends BaseRepository<TripStop> {
  constructor(
    @InjectRepository(TripStop)
    repository: Repository<TripStop>,
  ) {
    super(repository);
  }

  /** Locks the stop while its one immutable delivery proof is being stored. */
  findForDeliveryProofUpload(
    id: string,
    manager: EntityManager,
  ): Promise<TripStop | null> {
    return manager
      .getRepository(TripStop)
      .createQueryBuilder('tripStop')
      .innerJoinAndSelect('tripStop.trip', 'trip')
      .where('tripStop.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }
}
