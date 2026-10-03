import {
  BadRequestException,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { ImagePurpose } from '../../common/enums/image-purpose.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ImagesService } from './images.service';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  /**
   * POST /api/images?purpose=avatar|proof
   *
   * Uploads an image to Cloudinary, persists an Image row, and returns:
   *   { id: uuid, url: string, purpose: string }
   *
   * The caller stores the returned UUID wherever it needs to reference the image.
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  upload(
    @Query('purpose') purpose: string,
    @CurrentUser('userId') userId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ApiResponseDto> {
    if (!Object.values(ImagePurpose).includes(purpose as ImagePurpose)) {
      throw new BadRequestException(
        `Invalid purpose. Must be one of: ${Object.values(ImagePurpose).join(', ')}`,
      );
    }

    return this.imagesService.upload(file, purpose as ImagePurpose, userId);
  }

  /**
   * GET /api/images/:id
   *
   * Returns image metadata (id, url, purpose, originalName, mimeType, sizeBytes, createdAt).
   */
  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto> {
    return this.imagesService.findById(id);
  }

  /**
   * DELETE /api/images/:id
   *
   * Deletes the image from Cloudinary and removes the DB row.
   */
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto> {
    return this.imagesService.delete(id);
  }
}
