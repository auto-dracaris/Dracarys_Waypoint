import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiResponseDto } from './common/dto/api-response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async health(): Promise<ApiResponseDto> {
    const data = await this.appService.health();
    return new ApiResponseDto(HttpStatus.OK, 'Service is healthy', data);
  }
}
