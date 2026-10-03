import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { today } from '../../common/utils/date.util';
import { Outlet } from '../../database/entities/outlet.entity';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { PatchOutletAvailabilityDto } from './dto/patch-outlet-availability.dto';
import { QueryOutletDto } from './dto/query-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { OutletsRepository } from './repositories/outlets.repository';

// Postgres's unique-violation code; `outlets.unique_id` is unique.
const UNIQUE_VIOLATION = '23505';

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

  async findOne(outletId: number): Promise<ApiResponseDto> {
    return new ApiResponseDto(
      HttpStatus.OK,
      'Outlet retrieved successfully',
      await this.findOrThrow(outletId),
    );
  }

  async districts(): Promise<ApiResponseDto> {
    const districts = await this.outletsRepository.findDistricts();
    return new ApiResponseDto(
      HttpStatus.OK,
      'Districts retrieved successfully',
      districts.map(({ name, depot }) => ({ name, depot: depot?.name })),
    );
  }

  /** `actorId` is the dispatcher making the call, recorded as `created_by`. */
  async create(dto: CreateOutletDto, actorId: number): Promise<ApiResponseDto> {
    const district = await this.findDistrictOrThrow(dto.district);
    const { district: _district, ...fields } = dto;
    let saved: Outlet;
    try {
      saved = await this.outletsRepository.save(
        this.outletsRepository.create({
          ...fields,
          districtId: district.id,
          depotId: district.depotId,
          createdById: actorId,
          updatedById: actorId,
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Outlet ID already exists');
      }
      throw error;
    }

    return new ApiResponseDto(
      HttpStatus.CREATED,
      'Outlet created successfully',
      await this.findOrThrow(saved.id),
    );
  }

  async summary(): Promise<ApiResponseDto> {
    return new ApiResponseDto(
      HttpStatus.OK,
      'Outlet summary retrieved successfully',
      await this.outletsRepository.summarise(today()),
    );
  }

  /** The detail panel's extras: the next delivery day and the latest receipts and deferrals. */
  async overview(outletId: number): Promise<ApiResponseDto> {
    await this.findOrThrow(outletId);
    const [nextDelivery, recentActivity] = await Promise.all([
      this.outletsRepository.findNextDelivery(outletId, today()),
      this.outletsRepository.findRecentActivity(outletId, 5),
    ]);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Outlet overview retrieved successfully',
      { nextDelivery, recentActivity },
    );
  }

  /** `actorId` is the dispatcher making the call, recorded as `updated_by`. */
  async update(
    outletId: number,
    dto: UpdateOutletDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    const outlet = await this.findOrThrow(outletId);
    const { district: districtName, ...fields } = dto;
    Object.assign(outlet, fields, { updatedById: actorId });
    if (districtName !== undefined) {
      // The depot follows the district, so the two can never disagree.
      const district = await this.findDistrictOrThrow(districtName);
      outlet.districtId = district.id;
      outlet.depotId = district.depotId;
      // Drop the loaded relations, which would otherwise override the new ids on save.
      delete outlet.district;
      delete outlet.depot;
    }
    await this.outletsRepository.save(outlet);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Outlet updated successfully',
      await this.findOrThrow(outletId),
    );
  }

  async updateAvailability(
    outletId: number,
    dto: PatchOutletAvailabilityDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    const outlet = await this.findOrThrow(outletId);
    outlet.isAvailable = dto.isAvailable;
    outlet.updatedById = actorId;
    await this.outletsRepository.save(outlet);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Outlet availability updated successfully',
      await this.findOrThrow(outletId),
    );
  }

  private async findDistrictOrThrow(name: string) {
    const district = await this.outletsRepository.findDistrictByName(name);
    if (!district) {
      throw new BadRequestException('District not found');
    }
    return district;
  }

  private async findOrThrow(outletId: number): Promise<Outlet> {
    const outlet = await this.outletsRepository.findByOutletId(outletId);
    if (!outlet) {
      throw new NotFoundException(`Outlet with ID "${outletId}" not found`);
    }
    return outlet;
  }
}
