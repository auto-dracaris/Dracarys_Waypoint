import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../../../common/enums/user-status.enum';

export class PatchUserStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(UserStatus, {
    message: `Status must be one of: ${Object.values(UserStatus).join(', ')}`,
  })
  status: UserStatus;
}
