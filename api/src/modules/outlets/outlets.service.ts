import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { QueryOutletDto } from './dto/query-outlet.dto';
import { OutletsRepository } from './repositories/outlets.repository';

@Injectable()
export class OutletsService {
  constructor(private readonly outletsRepository: OutletsRepository) {}

  async findAll(query: QueryOutletDto): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [items, total] = await this.outletsRepository.findWithFilters(query);

    return new ApiResponseDto(HttpStatus.OK, 'Outlets retrieved successfully', {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async findOne(outletId: string): Promise<ApiResponseDto> {
    const outlet = await this.outletsRepository.findByOutletId(outletId);
    if (!outlet) {
      throw new NotFoundException(`Outlet with ID "${outletId}" not found`);
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Outlet retrieved successfully',
      outlet,
    );
  }
}
