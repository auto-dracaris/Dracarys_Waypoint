import { HttpStatus, NotFoundException } from '@nestjs/common';
import { DeepPartial, ObjectLiteral } from 'typeorm';
import { ApiResponseDto } from '../dto/api-response.dto';
import { BaseRepository } from '../repositories/base.repository';

/**
 * Plain create/findAll/findOne/update for a service, including 404 handling,
 * pagination shaping and `ApiResponseDto` wrapping.
 *
 * Business rules that need a DB lookup (uniqueness checks and the like) go in
 * the `beforeCreate` / `beforeUpdate` hooks. Anything beyond plain CRUD — an
 * extra route, a transactional flow — stays hand-written in the concrete
 * service using the inherited `repository` and `findOrThrow`.
 *
 * Don't force a service that has no generic CRUD flow to extend this.
 */
export abstract class BaseCrudService<T extends ObjectLiteral> {
  protected constructor(
    protected readonly repository: BaseRepository<T>,
    protected readonly entityName: string,
  ) {}

  protected async beforeCreate(_dto: DeepPartial<T>): Promise<void> {}

  protected async beforeUpdate(
    _id: string | number,
    _dto: DeepPartial<T>,
    _entity: T,
  ): Promise<void> {}

  async create(dto: DeepPartial<T>): Promise<ApiResponseDto> {
    await this.beforeCreate(dto);
    const entity = this.repository.create(dto);
    await this.repository.save(entity);
    return new ApiResponseDto(
      HttpStatus.CREATED,
      `${this.entityName} created successfully`,
      entity,
    );
  }

  async findAll(page: number = 1, limit: number = 10): Promise<ApiResponseDto> {
    const [items, total] = await this.repository.findAndCount(page, limit);
    return new ApiResponseDto(
      HttpStatus.OK,
      `${this.entityName}s retrieved successfully`,
      {
        items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    );
  }

  async findOne(id: string | number): Promise<ApiResponseDto> {
    const entity = await this.findOrThrow(id);
    return new ApiResponseDto(
      HttpStatus.OK,
      `${this.entityName} retrieved successfully`,
      entity,
    );
  }

  async update(
    id: string | number,
    dto: DeepPartial<T>,
  ): Promise<ApiResponseDto> {
    const entity = await this.findOrThrow(id);
    await this.beforeUpdate(id, dto, entity);
    Object.assign(entity, dto);
    await this.repository.save(entity);
    return new ApiResponseDto(
      HttpStatus.OK,
      `${this.entityName} updated successfully`,
      entity,
    );
  }

  protected async findOrThrow(id: string | number): Promise<T> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} with ID ${id} not found`);
    }
    return entity;
  }
}
