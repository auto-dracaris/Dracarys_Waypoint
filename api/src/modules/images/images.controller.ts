import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadImageDto } from './dto/upload-image.dto';
import { MAX_IMAGE_BYTES, ImagesService } from './images.service';
import type { UploadedImage } from './images.service';

// The one place a file enters the system. Every other endpoint takes the id
// this returns, in an ordinary JSON body. There is no route for reading an
// image: its URL comes with whatever it is attached to.
@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  // The file is held in memory (multer's default) and capped; the service
  // checks what it really is before storing it.
  @Post()
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  upload(
    @UploadedFile() file: UploadedImage | undefined,
    @Body() dto: UploadImageDto,
    @CurrentUser('userId') userId: number,
  ): Promise<ApiResponseDto> {
    return this.imagesService.upload(file, dto, userId);
  }
}
