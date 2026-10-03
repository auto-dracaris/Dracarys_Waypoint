import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    } else {
      const cloudinaryUrl =
        this.configService.get<string>('CLOUDINARY_URL') ||
        process.env.CLOUDINARY_URL;

      if (cloudinaryUrl) {
        const match = cloudinaryUrl.match(
          /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/,
        );
        if (match) {
          cloudinary.config({
            api_key: match[1],
            api_secret: match[2],
            cloud_name: match[3],
            secure: true,
          });
        } else {
          throw new Error('Invalid CLOUDINARY_URL format');
        }
      } else {
        throw new Error(
          'Missing Cloudinary configuration. Provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET, or CLOUDINARY_URL.',
        );
      }
    }
  }

  /**
   * Uploads a file buffer to Cloudinary.
   * @param buffer - The file buffer
   * @param publicId - The Cloudinary public_id (no extension)
   * @param folder - The Cloudinary folder path (e.g. 'waypoint/avatars')
   * @param overwrite - Whether a matching public ID may be replaced
   * @returns The secure_url of the uploaded image
   */
  async uploadImage(
    buffer: Buffer,
    publicId: string,
    folder: string,
    overwrite = true,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
          overwrite,
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            this.logger.error(
              `Cloudinary upload failed: ${error.message}`,
              error.stack,
            );
            const uploadError = new Error(
              `Cloudinary upload failed: ${error.message}`,
            );
            const stack =
              typeof error.stack === 'string' ? error.stack : undefined;
            uploadError.stack = stack;
            return reject(uploadError);
          }
          if (!result?.secure_url) {
            return reject(
              new Error('Cloudinary upload result missing secure_url'),
            );
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Deletes an image from Cloudinary by public_id.
   * @param publicId - The full Cloudinary public_id including folder
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      this.logger.warn(
        `Failed to delete image from Cloudinary (${publicId}): ${(error as Error)?.message}`,
      );
      throw error;
    }
  }
}
