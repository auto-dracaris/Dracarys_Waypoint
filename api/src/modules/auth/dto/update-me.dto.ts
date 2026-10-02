import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Fields a user may edit on their own profile.
 * Phone number is set during registration and can only be changed by a
 * dispatcher via `PUT /api/users/:id` — it is intentionally absent here.
 */
export class UpdateMeDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(100, { message: 'First name must be at most 100 characters' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(100, { message: 'Last name must be at most 100 characters' })
  lastName?: string;
}
