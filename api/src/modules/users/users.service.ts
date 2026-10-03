import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DepotsRepository } from '../../common/repositories/depots.repository';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { formatPhoneNumber } from '../../common/utils/phone.util';
import { User } from '../../database/entities/user.entity';
import { PatchUserRoleDto } from './dto/patch-user-role.dto';
import { PatchUserStatusDto } from './dto/patch-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService extends BaseCrudService<User> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly depotsRepository: DepotsRepository,
  ) {
    super(usersRepository, 'User');
  }

  protected async beforeUpdate(
    _id: string | number,
    dto: DeepPartial<User>,
    entity: User,
  ): Promise<void> {
    if (dto.phone && dto.phone !== entity.phone) {
      await this.assertPhoneIsFree(dto.phone);
    }
  }

  async findAll(page: number = 1, limit: number = 10): Promise<ApiResponseDto> {
    const [items, total] = await this.usersRepository.findAndCount(page, limit);

    return new ApiResponseDto(HttpStatus.OK, 'Users retrieved successfully', {
      items: items.map((user) => this.toPublic(user)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  /** `GET /users` — `findAll` plus optional role/status/search filters. */
  async findAllFiltered(query: UserListQueryDto): Promise<ApiResponseDto> {
    const { page = 1, limit = 10, role, status, search } = query;
    const [items, total] = await this.usersRepository.findFiltered(
      page,
      limit,
      { role, status, search },
    );

    return new ApiResponseDto(HttpStatus.OK, 'Users retrieved successfully', {
      items: items.map((user) => this.toPublic(user)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  async findOne(id: string | number): Promise<ApiResponseDto> {
    const user = await this.findWithDepotOrThrow(Number(id));
    return new ApiResponseDto(
      HttpStatus.OK,
      'User retrieved successfully',
      this.toPublic(user),
    );
  }

  /** `actorId` is the dispatcher making the call, recorded as `updated_by`. */
  async update(
    id: string | number,
    dto: DeepPartial<User>,
    actorId?: number,
  ): Promise<ApiResponseDto> {
    this.normalisePhone(dto);
    const user = await this.findOrThrow(id);
    await this.beforeUpdate(id, dto, user);
    Object.assign(user, dto);
    if (actorId) {
      user.updatedById = actorId;
    }
    const saved = await this.usersRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'User updated successfully',
      this.toPublic(saved),
    );
  }

  /**
   * `PUT /users/:id` — profile fields plus the home depot. The depot arrives
   * by name, so it is resolved to its row before the plain update runs.
   */
  async updateProfile(
    id: number,
    dto: UpdateUserDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    const { depot: depotName, ...fields } = dto;
    const changes: DeepPartial<User> = fields;
    if (depotName) {
      const depot = await this.depotsRepository.findByName(depotName);
      if (!depot) {
        throw new BadRequestException('Depot not found');
      }
      changes.depotId = depot.id;
    }
    await this.update(id, changes, actorId);

    return new ApiResponseDto(
      HttpStatus.OK,
      'User updated successfully',
      this.toPublic(await this.findWithDepotOrThrow(id)),
    );
  }

  /**
   * Status is the only way a user leaves the system — rows are never hard
   * deleted, so the audit trail and every historical reference stay intact.
   */
  async patchStatus(
    id: number,
    dto: PatchUserStatusDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    this.assertNotSelf(id, actorId, 'status');
    const user = await this.findOrThrow(id);
    user.status = dto.status;
    user.updatedById = actorId;
    const saved = await this.usersRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'User status updated successfully',
      this.toPublic(saved),
    );
  }

  /**
   * Takes effect on the user's next request — `JwtStrategy` reads the role
   * from the database, not from the token.
   */
  async patchRole(
    id: number,
    dto: PatchUserRoleDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    this.assertNotSelf(id, actorId, 'role');
    const user = await this.findOrThrow(id);
    user.role = dto.role;
    user.updatedById = actorId;
    const saved = await this.usersRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'User role updated successfully',
      this.toPublic(saved),
    );
  }

  /**
   * A dispatcher changing their own role or status could lock every admin out
   * of the system, so those changes have to be made by another dispatcher.
   */
  private assertNotSelf(
    id: number,
    actorId: number,
    field: 'role' | 'status',
  ): void {
    if (id === actorId) {
      throw new BadRequestException(`You cannot change your own ${field}`);
    }
  }

  /** Stored in the same format login looks phones up by. */
  private normalisePhone(dto: DeepPartial<User>): void {
    if (dto.phone) {
      dto.phone = formatPhoneNumber(dto.phone);
    }
  }

  private async assertPhoneIsFree(phone: string): Promise<void> {
    const existing = await this.usersRepository.findByPhone(phone);
    if (existing) {
      throw new ConflictException(
        'Phone number is already in use by another user',
      );
    }
  }

  /** With the depot row, so the response carries the depot's name. */
  private async findWithDepotOrThrow(id: number): Promise<User> {
    const user = await this.usersRepository.findWithDepot(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  private toPublic(user: User) {
    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }
}
