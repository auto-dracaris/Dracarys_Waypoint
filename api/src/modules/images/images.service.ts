import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { ImagePurpose } from '../../common/enums/image-purpose.enum';
import { Image } from '../../database/entities/image.entity';
import { ImagesRepository } from './repositories/images.repository';

/** Maps each purpose to its Cloudinary folder. */
const FOLDER_MAP: Record<ImagePurpose, string> = {
  [ImagePurpose.AVATAR]: 'waypoint/avatars',
  [ImagePurpose.PROOF]: 'waypoint/proofs',
};

@Injectable()
export class ImagesService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly imagesRepository: ImagesRepository,
  ) {}

  /**
   * Uploads a file to Cloudinary, saves an Image row, and returns its UUID.
   *
   * The caller stores that UUID wherever needed
   * (e.g. users.avatar_id, trip_stops.proof_id).
   */
  async upload(
    file: Express.Multer.File,
    purpose: ImagePurpose,
    uploadedById: number,
  ): Promise<ApiResponseDto> {
    const folder = FOLDER_MAP[purpose];

    // Build a deterministic public_id from the UUID we'll use so Cloudinary
    // and DB stay in sync even if the transaction below fails.
    // We generate a temporary ID; the real UUID comes from the saved entity.
    const tempPublicId = `${purpose}_${Date.now()}_${uploadedById}`;

    const url = await this.cloudinaryService.uploadImage(
      file.buffer,
      tempPublicId,
      folder,
      false, // overwrite=false — each upload is a unique asset
    );

    const image = new Image();
    image.publicId = `${folder}/${tempPublicId}`;
    image.url = url;
    image.purpose = purpose;
    image.originalName = file.originalname ?? null;
    image.mimeType = file.mimetype ?? null;
    image.sizeBytes = file.size ?? null;
    image.uploadedById = uploadedById;

    const saved = await this.imagesRepository.save(image);

    return new ApiResponseDto(HttpStatus.CREATED, 'Image uploaded successfully', {
      id: saved.id,
      url: saved.url,
      purpose: saved.purpose,
    });
  }

  /**
   * Returns image metadata by UUID.
   */
  async findById(id: string): Promise<ApiResponseDto> {
    const image = await this.imagesRepository.findById(id);
    if (!image) {
      throw new NotFoundException(`Image ${id} not found`);
    }

    return new ApiResponseDto(HttpStatus.OK, 'Image found', {
      id: image.id,
      url: image.url,
      purpose: image.purpose,
      originalName: image.originalName,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      createdAt: image.createdAt,
    });
  }

  /**
   * Deletes the image from Cloudinary and removes the DB row.
   */
  async delete(id: string): Promise<ApiResponseDto> {
    const image = await this.imagesRepository.findById(id);
    if (!image) {
      throw new NotFoundException(`Image ${id} not found`);
    }

    // Delete from Cloudinary (non-fatal if already gone)
    try {
      await this.cloudinaryService.deleteImage(image.publicId);
    } catch {
      // Log but don't block the DB cleanup
    }

    await this.imagesRepository.delete(id);

    return new ApiResponseDto(HttpStatus.OK, 'Image deleted successfully', null);
  }

  // ── Helpers kept for backward-compat with old avatar flow ──────────────────

  /**
   * Extracts the Cloudinary public_id from a secure URL.
   * Format: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<id>.<ext>
   */
  extractPublicId(url: string): string | null {
    if (!url) return null;
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;
    let path = url.slice(uploadIndex + '/upload/'.length);
    path = path.replace(/^v\d+\//, '');
    const dotIdx = path.lastIndexOf('.');
    return dotIdx !== -1 ? path.slice(0, dotIdx) : path || null;
  }
}
