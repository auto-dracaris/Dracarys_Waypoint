import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { Image } from './image.entity';
import { Outlet } from './outlet.entity';
import { Trip } from './trip.entity';

/**
 * Who received a delivery at an outlet, with their signature or a photo. One
 * per stop of a trip; a stop is every order the trip carries to one outlet.
 * The id is minted on the driver's handset, so a record sent twice (a retry
 * after working offline) is stored once.
 */
@Entity('delivery_proofs')
@Index(['tripId'])
export class DeliveryProof extends UuidBaseEntity {
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip>;

  @Column({ name: 'outlet_id', type: 'int' })
  outletId: number;

  @ManyToOne(() => Outlet)
  @JoinColumn({ name: 'outlet_id' })
  outlet?: Relation<Outlet>;

  // The outlet staff member who took the goods.
  @Column({ name: 'received_by', type: 'varchar', length: 150 })
  receivedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // The receiver's signature and a photo of the delivery; at least one is set.
  @Column({ name: 'signature_image_id', type: 'uuid', nullable: true })
  signatureImageId: string | null;

  @ManyToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'signature_image_id' })
  signatureImage?: Relation<Image> | null;

  @Column({ name: 'photo_image_id', type: 'uuid', nullable: true })
  photoImageId: string | null;

  @ManyToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'photo_image_id' })
  photoImage?: Relation<Image> | null;

  // The handset's clock, for a proof captured offline.
  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;
}
