import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ISSUE_TITLES } from '../../common/constants/issue.constant';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ImagePurpose } from '../../common/enums/image-purpose.enum';
import { orderReference } from '../../common/utils/order.util';
import { DeliveryProof } from '../../database/entities/delivery-proof.entity';
import { Trip } from '../../database/entities/trip.entity';
import { ImagesService } from '../images/images.service';
import { DeliveryProofDto } from './dto/record.dto';
import { TripRecordsRepository } from './repositories/trip-records.repository';
import { TripsService, outletName, stopsOf } from './trips.service';

@Injectable()
export class TripRecordsService {
  constructor(
    private readonly recordsRepository: TripRecordsRepository,
    private readonly tripsService: TripsService,
    private readonly imagesService: ImagesService,
  ) {}

  /**
   * Who took the delivery at a stop, with their signature or a photo already
   * uploaded through `POST /images`. The record's id comes from the handset,
   * so sending it again stores nothing new.
   */
  async addProof(
    tripId: string,
    stopId: number,
    dto: DeliveryProofDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const trip = await this.tripsService.loadFor(tripId, user);
    this.stopOrThrow(trip, stopId);

    const existing = await this.recordsRepository.findProofById(dto.clientId);
    if (existing) {
      this.assertSameTrip(existing.tripId, tripId);
      return new ApiResponseDto(
        HttpStatus.OK,
        'Proof already saved',
        this.toProofView(existing),
      );
    }
    if (!dto.signatureImageId && !dto.photoImageId) {
      throw new BadRequestException('Attach a signature or a photo');
    }
    const [signature, photo] = await Promise.all([
      dto.signatureImageId
        ? this.imagesService.findForUse(
            dto.signatureImageId,
            ImagePurpose.PROOF_SIGNATURE,
            user.userId,
          )
        : null,
      dto.photoImageId
        ? this.imagesService.findForUse(
            dto.photoImageId,
            ImagePurpose.PROOF_PHOTO,
            user.userId,
          )
        : null,
    ]);

    await this.recordsRepository.save(
      this.recordsRepository.create({
        id: dto.clientId,
        tripId,
        outletId: stopId,
        receivedBy: dto.receivedBy.trim(),
        notes: dto.notes?.trim() || null,
        signatureImageId: signature?.id ?? null,
        photoImageId: photo?.id ?? null,
        recordedAt: new Date(),
        createdById: user.userId,
        updatedById: user.userId,
      }),
    );

    return new ApiResponseDto(
      HttpStatus.CREATED,
      'Proof of delivery saved',
      this.toProofView(
        (await this.recordsRepository.findProofById(dto.clientId))!,
      ),
    );
  }

  /** Everything recorded on the trip so far, newest first. */
  async findRecords(
    tripId: string,
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const trip = await this.tripsService.loadFor(tripId, user);
    const [proofs, issues] = await Promise.all([
      this.recordsRepository.findProofs(tripId),
      this.recordsRepository.findIssues(tripId),
    ]);

    // Whatever the server holds has, by definition, synced.
    const records = [
      ...stopsOf(trip)
        .filter((stop) => stop.rows[0].actualArrivalAt)
        .map((stop) => ({
          id: `${tripId}:${stop.outletId}`,
          kind: 'arrival',
          title: `Arrived at ${outletName(stop.outlet)}`,
          savedAt: stop.rows[0].actualArrivalAt!,
        })),
      ...issues.map((issue) => ({
        id: issue.id,
        kind: 'issue',
        title: `${ISSUE_TITLES[issue.type]}${issue.orderId ? ` · ${orderReference(issue.orderId)}` : ''}`,
        savedAt: issue.recordedAt ?? issue.createdAt,
      })),
      ...proofs.map((proof) => ({
        id: proof.id,
        kind: 'proof',
        title: `Proof of delivery · ${outletName(proof.outlet!)}`,
        savedAt: proof.recordedAt,
      })),
    ]
      .sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime())
      .map((record) => ({ ...record, syncState: 'synced' }));

    return new ApiResponseDto(HttpStatus.OK, 'Records retrieved successfully', {
      items: records.slice((page - 1) * limit, page * limit),
      meta: {
        total: records.length,
        page,
        limit,
        totalPages: Math.ceil(records.length / limit),
      },
    });
  }

  // An image is named by id on its record; the response gives the URL it is
  // loaded from, so no client ever has to ask for an image separately.
  private toProofView(proof: DeliveryProof) {
    const { signatureImage, photoImage, ...fields } = proof;
    return {
      ...fields,
      signatureUrl: signatureImage?.url ?? null,
      photoUrl: photoImage?.url ?? null,
    };
  }

  private stopOrThrow(trip: Trip, stopId: number) {
    const stop = stopsOf(trip).find(
      (candidate) => candidate.outletId === stopId,
    );
    if (!stop) {
      throw new NotFoundException('This trip has no such stop');
    }
    return stop;
  }

  // A handset id is unique to one record; meeting it on another trip means
  // something is wrong on the handset, not a retry.
  private assertSameTrip(recordTripId: string | null, tripId: string): void {
    if (recordTripId !== tripId) {
      throw new ConflictException(
        'This clientId was already used on another trip',
      );
    }
  }
}
