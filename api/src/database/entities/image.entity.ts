import { Column, Entity, Index } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { ImagePurpose } from '../../common/enums/image-purpose.enum';

/**
 * One uploaded image, wherever it is used: a profile picture, a proof of
 * delivery, an issue photo. The file itself is on Cloudinary; this row is how
 * the rest of the system refers to it. The id may be minted on a handset, so
 * an upload retried after working offline is stored once. Who uploaded it is
 * the inherited `created_by`.
 */
@Entity('images')
@Index(['purpose'])
export class Image extends UuidBaseEntity {
  // Cloudinary's id for the asset, needed to delete it.
  @Column({ name: 'public_id', type: 'varchar', length: 255, unique: true })
  publicId: string;

  // The https address clients load the image from.
  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'enum', enum: ImagePurpose })
  purpose: ImagePurpose;

  // png or jpg.
  @Column({ type: 'varchar', length: 10 })
  format: string;

  @Column({ type: 'int' })
  width: number;

  @Column({ type: 'int' })
  height: number;

  @Column({ type: 'int' })
  bytes: number;
}
