import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { VehiclesRepository } from './repositories/vehicles.repository';

@Injectable()
export class VehiclesService {
  constructor(private readonly vehiclesRepository: VehiclesRepository) {}

  async findAll(query: QueryVehicleDto): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [items, total] = await this.vehiclesRepository.findWithFilters(query);

    return new ApiResponseDto(HttpStatus.OK, 'Vehicles retrieved successfully', {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async findOne(vehicleId: number): Promise<ApiResponseDto> {
    const vehicle = await this.vehiclesRepository.findByVehicleId(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${vehicleId}" not found`);
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Vehicle retrieved successfully',
      vehicle,
    );
  }
}
