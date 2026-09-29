import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { User } from '../../../database/entities/user.entity';

export interface UserListFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
  ) {
    super(repository);
  }

  // Entity-specific queries only — the CRUD four come from BaseRepository.
  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.repository.findOneBy({ phone });
  }

  /**
   * Paginated list narrowed by role/status. `search` is an OR across name,
   * email and phone — TypeORM expresses OR as an array of where-objects, each
   * one repeating the role/status filters so they still apply to every branch.
   */
  findFiltered(
    page: number,
    limit: number,
    filters: UserListFilters,
  ): Promise<[User[], number]> {
    const base: FindOptionsWhere<User> = {};
    if (filters.role) {
      base.role = filters.role;
    }
    if (filters.status) {
      base.status = filters.status;
    }

    // Escape LIKE wildcards so a search for "a_b" or "50%" matches literally.
    const search = filters.search?.trim().replace(/[\\%_]/g, '\\$&');
    const where = search
      ? (['firstName', 'lastName', 'email', 'phone'] as const).map(
          (column) => ({ ...base, [column]: ILike(`%${search}%`) }),
        )
      : base;

    return this.findAndCount(page, limit, { where });
  }
}
