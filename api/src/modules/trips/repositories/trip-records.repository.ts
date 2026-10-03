import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { DeliveryProof } from '../../../database/entities/delivery-proof.entity';
import { Issue } from '../../../database/entities/issue.entity';

/** What a driver puts on record at a stop: proofs of delivery and issues. */
@Injectable()
export class TripRecordsRepository extends BaseRepository<DeliveryProof> {
  constructor(
    @InjectRepository(DeliveryProof)
    repository: Repository<DeliveryProof>,
  ) {
    super(repository);
  }

  private get issues(): Repository<Issue> {
    return this.repository.manager.getRepository(Issue);
  }

  /** A proof with its images, so a response can carry their URLs. */
  findProofById(id: string): Promise<DeliveryProof | null> {
    return this.repository.findOne({
      where: { id },
      relations: { signatureImage: true, photoImage: true },
    });
  }

  /** Whether a proof of delivery is on record for one stop of a trip. */
  async hasProof(tripId: string, outletId: number): Promise<boolean> {
    return (await this.repository.countBy({ tripId, outletId })) > 0;
  }

  findProofs(tripId: string): Promise<DeliveryProof[]> {
    return this.repository.find({
      where: { tripId },
      relations: { outlet: true },
    });
  }

  findIssues(tripId: string): Promise<Issue[]> {
    return this.issues.findBy({ tripId });
  }
}
