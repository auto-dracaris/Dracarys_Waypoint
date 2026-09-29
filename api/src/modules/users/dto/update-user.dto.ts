import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Profile fields only, all optional. Password changes through
 * `PUT /api/auth/change-password` (which verifies the current one), role
 * through `PATCH /api/users/:id/role` and status through
 * `PATCH /api/users/:id/status`.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(150, { message: 'Email must be at most 150 characters' })
  email?: string;

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
}
