import { Column, Entity } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { ImagePurpose } from '../../common/enums/image-purpose.enum';

/**
 * A single uploaded image, stored in Cloudinary.
 *
 * Callers upload via POST /api/images?purpose=avatar|proof and receive back
 * this row's UUID.  They then store that UUID on their own entity
 * (e.g. users.avatar_id, trip_stops.proof_id) instead of a raw URL.
 *
 * The raw Cloudinary URL is kept here so it can be served without a
 * second round-trip.  The publicId allows the file to be deleted from
 * Cloudinary when the row is soft/hard deleted.
 */
@Entity('images')
export class Image extends UuidBaseEntity {
  /** Cloudinary folder + filename, e.g. "waypoint/avatars/abc123". */
  @Column({ name: 'public_id', type: 'text' })
  publicId: string;

  /** Full Cloudinary secure_url. */
  @Column({ name: 'url', type: 'text' })
  url: string;

  /** What this image is used for — drives folder routing on Cloudinary. */
  @Column({ type: 'enum', enum: ImagePurpose })
  purpose: ImagePurpose;

  /** Original filename from the multipart upload (for audit). */
  @Column({ name: 'original_name', type: 'varchar', length: 255, nullable: true })
  originalName: string | null;

  /** MIME type of the uploaded file, e.g. "image/jpeg". */
  @Column({ name: 'mime_type', type: 'varchar', length: 50, nullable: true })
  mimeType: string | null;

  /** File size in bytes. */
  @Column({ name: 'size_bytes', type: 'int', nullable: true })
  sizeBytes: number | null;

  /** The user who uploaded the image. */
  @Column({ name: 'uploaded_by', type: 'int', nullable: true })
  uploadedById: number | null;
}
