import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class PatchUserRoleDto {
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, {
    message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role: UserRole;
}
