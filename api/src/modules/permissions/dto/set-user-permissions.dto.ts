import { ArrayUnique, IsArray, IsString } from 'class-validator';

/**
 * The full set of permission titles the user should end up with — this replaces
 * their grants rather than adding to them, so a client can send back exactly
 * what its checkbox list shows.
 */
export class SetUserPermissionsDto {
  @IsArray({ message: 'permissions must be an array' })
  @ArrayUnique({ message: 'permissions must not contain duplicates' })
  @IsString({ each: true, message: 'Each permission must be a string' })
  permissions: string[];
}
