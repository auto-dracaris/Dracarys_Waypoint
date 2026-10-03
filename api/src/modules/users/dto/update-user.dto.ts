import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Depot } from '../../../common/enums/depot.enum';

/**
 * Profile fields and home depot, all optional. Password changes through
 * `PUT /api/auth/change-password` (which verifies the current one), role
 * through `PATCH /api/users/:id/role` and status through
 * `PATCH /api/users/:id/status`.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(100, { message: 'First name must be at most 100 characters' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(100, { message: 'Last name must be at most 100 characters' })
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone must be at most 20 characters' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Avatar must be a string' })
  avatar?: string;

  // By name, the same way vehicles take their depot.
  @IsOptional()
  @IsEnum(Depot, {
    message: `Depot must be one of: ${Object.values(Depot).join(', ')}`,
  })
  depot?: Depot;

  // The outlet a store manager orders for, by its dataset id (e.g. OUT001);
  // null unlinks it.
  @IsOptional()
  @IsString({ message: 'Outlet must be an outlet ID' })
  @MaxLength(20, { message: 'Outlet must be at most 20 characters' })
  outlet?: string | null;
}
