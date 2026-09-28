import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DeepPartial } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { User } from '../../database/entities/user.entity';
import { PatchUserStatusDto } from './dto/patch-user-status.dto';
import { UsersRepository } from './repositories/users.repository';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService extends BaseCrudService<User> {
  constructor(private readonly usersRepository: UsersRepository) {
    super(usersRepository, 'User');
  }

  protected async beforeCreate(dto: DeepPartial<User>): Promise<void> {
    await this.assertEmailIsFree(dto.email as string);
    if (dto.phone) {
      await this.assertPhoneIsFree(dto.phone as string);
    }
  }

  protected async beforeUpdate(
    _id: string | number,
    dto: DeepPartial<User>,
    entity: User,
  ): Promise<void> {
    if (dto.email && dto.email !== entity.email) {
      await this.assertEmailIsFree(dto.email);
    }
    if (dto.phone && dto.phone !== entity.phone) {
      await this.assertPhoneIsFree(dto.phone as string);
    }
  }

  async create(dto: DeepPartial<User> & { password?: string }): Promise<ApiResponseDto> {
    await this.beforeCreate(dto);
    const { password, ...rest } = dto;
    const user = this.usersRepository.create({
      ...rest,
      passwordHash: await bcrypt.hash(password as string, BCRYPT_ROUNDS),
    });
    const saved = await this.usersRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.CREATED,
      'User created successfully',
      this.toPublic(saved),
    );
  }

  async findAll(page: number = 1, limit: number = 10): Promise<ApiResponseDto> {
    const [items, total] = await this.usersRepository.findAndCount(page, limit);

    return new ApiResponseDto(HttpStatus.OK, 'Users retrieved successfully', {
      items: items.map((user) => this.toPublic(user)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  async findOne(id: string | number): Promise<ApiResponseDto> {
    const user = await this.findOrThrow(id);
    return new ApiResponseDto(
      HttpStatus.OK,
      'User retrieved successfully',
      this.toPublic(user),
    );
  }

  async update(
    id: string | number,
    dto: DeepPartial<User>,
  ): Promise<ApiResponseDto> {
    const user = await this.findOrThrow(id);
    await this.beforeUpdate(id, dto, user);
    Object.assign(user, dto);
    const saved = await this.usersRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'User updated successfully',
      this.toPublic(saved),
    );
  }

  /**
   * Status is the only way a user leaves the system — rows are never hard
   * deleted, so the audit trail and every historical reference stay intact.
   */
  async patchStatus(
    id: number,
    dto: PatchUserStatusDto,
  ): Promise<ApiResponseDto> {
    const user = await this.findOrThrow(id);
    user.status = dto.status;
    const saved = await this.usersRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'User status updated successfully',
      this.toPublic(saved),
    );
  }

  private async assertEmailIsFree(email: string): Promise<void> {
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already in use by another user');
    }
  }

  private async assertPhoneIsFree(phone: string): Promise<void> {
    const existing = await this.usersRepository.findByPhone(phone);
    if (existing) {
      throw new ConflictException('Phone number is already in use by another user');
    }
  }

  private toPublic(user: User) {
    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }
}
