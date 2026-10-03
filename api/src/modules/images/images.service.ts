import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { ImagePurpose } from '../../common/enums/image-purpose.enum';
import { Image } from '../../database/entities/image.entity';
import { UploadImageDto } from './dto/upload-image.dto';
import { ImagesRepository } from './repositories/images.repository';

/** The part of an uploaded file this service reads. */
export interface UploadedImage {
  buffer: Buffer;
  size: number;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Everything this API uploads sits under one folder, then one per purpose.
const ROOT_FOLDER = 'waypoint';

/** PNG or JPEG by its leading bytes; what the client claims is not trusted. */
function imageFormat(buffer: Buffer): 'png' | 'jpg' | null {
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return 'png';
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'jpg';
  }
  return null;
}

/**
 * Every image in the system goes through here: the file is stored on
 * Cloudinary and an `images` row is what everything else refers to.
 */
@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly imagesRepository: ImagesRepository,
    private readonly configService: ConfigService,
  ) {}

  /** `POST /images`: store a file and return the image to attach elsewhere. */
  async upload(
    file: UploadedImage | undefined,
    dto: UploadImageDto,
    uploaderId: number,
  ): Promise<ApiResponseDto> {
    // A retry of an upload that already went through is answered with the
    // stored image rather than uploaded again.
    if (dto.clientId) {
      const existing = await this.imagesRepository.findById(dto.clientId);
      if (existing) {
        if (existing.createdById !== uploaderId) {
          throw new ConflictException('This clientId is already in use');
        }
        return new ApiResponseDto(
          HttpStatus.OK,
          'Image already uploaded',
          this.toView(existing),
        );
      }
    }
    if (!file) {
      throw new BadRequestException('Attach the file as `image`');
    }
    const format = imageFormat(file.buffer);
    if (!format) {
      throw new BadRequestException('Images must be PNG or JPEG');
    }

    const asset = await this.store(file.buffer, dto.purpose);
    let image: Image;
    try {
      image = await this.imagesRepository.save(
        this.imagesRepository.create({
          ...(dto.clientId && { id: dto.clientId }),
          publicId: asset.public_id,
          url: asset.secure_url,
          purpose: dto.purpose,
          format,
          width: asset.width,
          height: asset.height,
          bytes: asset.bytes,
          createdById: uploaderId,
          updatedById: uploaderId,
        }),
      );
    } catch (error) {
      // Without its row the stored file could never be found again.
      await this.destroy(asset.public_id);
      throw error;
    }

    return new ApiResponseDto(
      HttpStatus.CREATED,
      'Image uploaded successfully',
      this.toView(image),
    );
  }

  /**
   * The image a caller is attaching to something of theirs. It must be one
   * they uploaded, for that purpose; anything else is refused rather than
   * letting one user point at another's image.
   */
  async findForUse(
    imageId: string,
    purpose: ImagePurpose,
    userId: number,
  ): Promise<Image> {
    const image = await this.imagesRepository.findById(imageId);
    if (!image || image.createdById !== userId || image.purpose !== purpose) {
      throw new BadRequestException(
        `${imageId} is not a ${purpose.replace(/_/g, ' ')} image you uploaded`,
      );
    }
    return image;
  }

  /** Deletes an image that is no longer used, file and row. */
  async remove(image: Image): Promise<void> {
    await this.destroy(image.publicId);
    await this.imagesRepository.remove(image);
  }

  toView(image: Image) {
    return {
      id: image.id,
      url: image.url,
      purpose: image.purpose,
      format: image.format,
      width: image.width,
      height: image.height,
      bytes: image.bytes,
    };
  }

  /**
   * The Cloudinary account, read when it is needed rather than at startup, so
   * the API still runs without one; only uploads are unavailable.
   */
  private configure(): void {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('Image storage is not configured');
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  private store(
    buffer: Buffer,
    purpose: ImagePurpose,
  ): Promise<UploadApiResponse> {
    this.configure();
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: `${ROOT_FOLDER}/${purpose}`, resource_type: 'image' },
          (error, result) => {
            if (error || !result) {
              this.logger.error(
                `Cloudinary upload failed: ${error?.message ?? 'no result'}`,
              );
              reject(new BadGatewayException('Could not store the image'));
            } else {
              resolve(result);
            }
          },
        )
        .end(buffer);
    });
  }

  // A file that cannot be deleted is logged and left: the caller's own work
  // has already succeeded and should not fail over a leftover file.
  private async destroy(publicId: string): Promise<void> {
    try {
      this.configure();
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.warn(
        `Could not delete ${publicId} from Cloudinary: ${(error as Error).message}`,
      );
    }
  }
}
