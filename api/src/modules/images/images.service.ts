import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DataSource } from 'typeorm';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TripStopImagesRepository } from './repositories/trip-stop-images.repository';
import { UserImagesRepository } from './repositories/user-images.repository';

@Injectable()
export class ImagesService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly userImagesRepository: UserImagesRepository,
    private readonly tripStopImagesRepository: TripStopImagesRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Uploads an avatar image for a user, replacing any existing avatar in Cloudinary.
   */
  async uploadAvatar(
    userId: number,
    file: Express.Multer.File,
  ): Promise<ApiResponseDto> {
    const user = await this.userImagesRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const publicId = `${userId}_avatar`;
    const folder = 'waypoint/avatars';
    const secureUrl = await this.cloudinaryService.uploadImage(
      file.buffer,
      publicId,
      folder,
    );

    user.avatar = secureUrl;
    await this.userImagesRepository.save(user);

    return new ApiResponseDto(HttpStatus.OK, 'Avatar uploaded successfully', {
      avatarUrl: secureUrl,
    });
  }

  /**
   * Deletes an avatar image from Cloudinary and clears user.avatar in database.
   */
  async deleteAvatar(userId: number): Promise<ApiResponseDto> {
    const user = await this.userImagesRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.avatar) {
      throw new BadRequestException('No avatar to delete');
    }

    const publicId = this.extractPublicId(user.avatar);
    if (publicId) {
      await this.cloudinaryService.deleteImage(publicId);
    }

    user.avatar = null;
    await this.userImagesRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Avatar deleted successfully',
      null,
    );
  }

  /**
   * Uploads immutable delivery proof image for a trip stop. Cannot be updated or deleted.
   */
  async uploadDeliveryProof(
    tripStopId: string,
    userId: number,
    file: Express.Multer.File,
  ): Promise<ApiResponseDto> {
    if (!isUUID(tripStopId)) {
      throw new NotFoundException(`Trip stop with ID ${tripStopId} not found`);
    }

    const folder = 'waypoint/delivery-proofs';
    const publicId = tripStopId;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let secureUrl: string;
    let uploaded = false;
    try {
      const tripStop =
        await this.tripStopImagesRepository.findForDeliveryProofUpload(
          tripStopId,
          queryRunner.manager,
        );
      if (!tripStop) {
        throw new NotFoundException(
          `Trip stop with ID ${tripStopId} not found`,
        );
      }
      if (tripStop.trip?.driverId !== userId) {
        throw new ForbiddenException(
          'You can only upload proof for your assigned trip stops',
        );
      }
      if (tripStop.deliveryProofUrl) {
        throw new BadRequestException('Delivery proof already uploaded');
      }

      // Keep the lock through the upload so another request cannot replace it.
      secureUrl = await this.cloudinaryService.uploadImage(
        file.buffer,
        publicId,
        folder,
        false,
      );
      uploaded = true;
      tripStop.deliveryProofUrl = secureUrl;
      await this.tripStopImagesRepository.save(tripStop, queryRunner.manager);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (uploaded) {
        await this.cloudinaryService.deleteImage(`${folder}/${publicId}`);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Delivery proof uploaded successfully',
      {
        deliveryProofUrl: secureUrl,
      },
    );
  }

  /**
   * Extracts the Cloudinary public_id (including folder path) from a secure URL.
   * Format: https://res.cloudinary.com/<cloud>/image/upload/v<version>/<folder>/<publicId>.<ext>
   * Example output: 'waypoint/avatars/5_avatar'
   */
  private extractPublicId(url: string): string | null {
    if (!url) return null;
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let path = url.slice(uploadIndex + '/upload/'.length);
    // Strip version prefix if present, e.g. v1234567890/
    path = path.replace(/^v\d+\//, '');
    // Strip extension
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      path = path.slice(0, lastDotIndex);
    }
    return path || null;
  }
}
