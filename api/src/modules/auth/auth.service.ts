import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager } from 'typeorm';
import { MAX_OTP_ATTEMPTS } from '../../common/constants/otp.constant';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Depot } from '../../common/enums/depot.enum';
import { ImagePurpose } from '../../common/enums/image-purpose.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { DepotsRepository } from '../../common/repositories/depots.repository';
import { SmsService } from '../../common/sms/sms.service';
import { formatPhoneNumber } from '../../common/utils/phone.util';
import { vehicleLabel } from '../../common/utils/vehicle.util';
import { User } from '../../database/entities/user.entity';
import { UserSession } from '../../database/entities/user-session.entity';
import { ImagesService } from '../images/images.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpPurpose } from './enums/otp-purpose.enum';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserAuthRepository } from './repositories/user-auth.repository';
import { UserOtpRepository } from './repositories/user-otp.repository';
import { UserSessionRepository } from './repositories/user-session.repository';

const BCRYPT_ROUNDS = 10;
const INVALID_OTP_MESSAGE = 'Invalid or expired OTP';

// How soon a second reset code may be asked for, so the endpoint cannot be
// used to flood a phone with messages.
const RESET_CODE_COOLDOWN_MS = 60_000;

/** A code just issued: the code to text, its row and how long it lasts. */
interface IssuedOtp {
  otp: string;
  otpId: number;
  expireMinutes: number;
}

/**
 * Handles all authentication, registration, session management, and OTP verification flows.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userAuthRepository: UserAuthRepository,
    private readonly userSessionRepository: UserSessionRepository,
    private readonly userOtpRepository: UserOtpRepository,
    private readonly depotsRepository: DepotsRepository,
    private readonly smsService: SmsService,
    private readonly imagesService: ImagesService,
  ) {}

  async register(registerDto: RegisterDto): Promise<ApiResponseDto> {
    const formattedPhone = formatPhoneNumber(registerDto.phone);

    const phoneExists =
      await this.userAuthRepository.findByPhone(formattedPhone);
    if (phoneExists) {
      throw new ConflictException(
        'Phone number is already in use by another user',
      );
    }

    // Everyone starts at the default depot; a dispatcher moves them later.
    const depot = await this.depotsRepository.findByName(Depot.PELIYAGODA);
    if (!depot) {
      throw new BadRequestException('Default depot not found');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, BCRYPT_ROUNDS);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;
    let issued: IssuedOtp;

    try {
      const newUser = this.userAuthRepository.create({
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: formattedPhone,
        passwordHash,
        // Self-registration always creates a driver; other roles are assigned by a dispatcher.
        role: UserRole.DRIVER,
        status: UserStatus.PENDING,
        depotId: depot.id,
      });
      savedUser = await this.userAuthRepository.save(
        newUser,
        queryRunner.manager,
      );

      issued = await this.issueOtp(
        savedUser.id,
        OtpPurpose.REGISTRATION,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        error.message || 'Registration failed due to an internal error',
      );
    } finally {
      await queryRunner.release();
    }

    // Queue the OTP SMS; delivery happens in SmsConsumer, off the request path
    await this.sendOtp(formattedPhone, issued, 'verification');

    return new ApiResponseDto(
      HttpStatus.CREATED,
      'User registered successfully. Please verify your OTP.',
      {
        userId: savedUser.id,
        otpId: issued.otpId,
        ...this.otpForTesting(issued),
      },
    );
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<ApiResponseDto> {
    const formattedPhone = formatPhoneNumber(verifyOtpDto.phone);

    const userOtp = await this.userOtpRepository.findById(verifyOtpDto.otpId);
    // A registration code always belongs to the user who is registering.
    if (
      !userOtp ||
      userOtp.purpose !== OtpPurpose.REGISTRATION ||
      userOtp.userId === null
    ) {
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    if (new Date() > userOtp.expiresAt) {
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    const user = await this.userAuthRepository.findById(userOtp.userId);
    if (!user || user.phone !== formattedPhone) {
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already verified');
    }

    const isValid = await bcrypt.compare(verifyOtpDto.otp, userOtp.otpHash);
    if (!isValid) {
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    user.status = UserStatus.ACTIVE;
    await this.userAuthRepository.save(user);
    await this.userOtpRepository.deleteById(userOtp.id);

    return new ApiResponseDto(HttpStatus.OK, 'OTP verified successfully', null);
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<ApiResponseDto> {
    const formattedPhone = formatPhoneNumber(resendOtpDto.phone);

    const user = await this.userAuthRepository.findByPhone(formattedPhone);
    if (!user) {
      throw new NotFoundException('User with this phone number not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already verified');
    }

    const issued = await this.issueOtp(user.id, OtpPurpose.REGISTRATION);
    await this.sendOtp(formattedPhone, issued, 'verification');

    return new ApiResponseDto(HttpStatus.OK, 'OTP resent successfully', {
      otpId: issued.otpId,
      ...this.otpForTesting(issued),
    });
  }

  /**
   * Texts a reset code to an active account. The answer is the same whether
   * or not the number has one, so this cannot be used to find out which
   * numbers are registered.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<ApiResponseDto> {
    const formattedPhone = formatPhoneNumber(dto.phone);
    const user = await this.userAuthRepository.findByPhone(formattedPhone);

    let issued: IssuedOtp | undefined;
    if (user?.status === UserStatus.ACTIVE) {
      const previous = await this.userOtpRepository.findByUserIdAndPurpose(
        user.id,
        OtpPurpose.PASSWORD_RESET,
      );
      const tooSoon =
        !!previous &&
        Date.now() - previous.createdAt.getTime() < RESET_CODE_COOLDOWN_MS;
      if (!tooSoon) {
        issued = await this.issueOtp(user.id, OtpPurpose.PASSWORD_RESET);
        await this.sendOtp(formattedPhone, issued, 'password reset');
      }
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'If that number has an account, a code has been sent.',
      issued ? this.otpForTesting(issued) : {},
    );
  }

  /**
   * Sets a new password with the code from `forgotPassword`, and signs the
   * user out everywhere, since anyone using the old password should be.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<ApiResponseDto> {
    const user = await this.userAuthRepository.findByPhone(
      formatPhoneNumber(dto.phone),
    );
    const userOtp =
      user?.status === UserStatus.ACTIVE
        ? await this.userOtpRepository.findByUserIdAndPurpose(
            user.id,
            OtpPurpose.PASSWORD_RESET,
          )
        : null;
    // One message for every way this can fail, so nothing is learned from it.
    if (!user || !userOtp || new Date() > userOtp.expiresAt) {
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    if (!(await bcrypt.compare(dto.otp, userOtp.otpHash))) {
      userOtp.attempts += 1;
      if (userOtp.attempts >= MAX_OTP_ATTEMPTS) {
        await this.userOtpRepository.deleteById(userOtp.id);
      } else {
        await this.userOtpRepository.save(userOtp);
      }
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    user.updatedById = user.id;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.userAuthRepository.save(user, queryRunner.manager);
      await this.userOtpRepository.deleteById(userOtp.id, queryRunner.manager);
      await this.userSessionRepository.revokeAllForUser(
        user.id,
        queryRunner.manager,
      );
      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        error.message || 'Password reset failed due to an internal error',
      );
    } finally {
      await queryRunner.release();
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Password reset successfully. Sign in with your new password.',
      null,
    );
  }

  async login(loginDto: LoginDto): Promise<ApiResponseDto> {
    const formattedPhone = formatPhoneNumber(loginDto.phone);
    const user = await this.userAuthRepository.findByPhone(formattedPhone);

    // One generic error message so endpoint cannot be used for user enumeration
    if (
      !user ||
      !(await bcrypt.compare(loginDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(
        'Please verify your phone number with the OTP first',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is not active');
    }

    const tokens = await this.issueSession(user);

    return new ApiResponseDto(HttpStatus.OK, 'Logged in successfully', {
      ...tokens,
      user: await this.toProfile(user),
    });
  }

  async me(userId: number): Promise<ApiResponseDto> {
    const user = await this.findUserOrThrow(userId);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Profile retrieved successfully',
      await this.toProfile(user),
    );
  }

  async updateMe(
    userId: number,
    updateMeDto: UpdateMeDto,
  ): Promise<ApiResponseDto> {
    const user = await this.findUserOrThrow(userId);
    const { avatarImageId, ...fields } = updateMeDto;
    Object.assign(user, fields);
    user.updatedById = userId;

    // Undefined leaves the picture alone; null removes it; an id replaces it.
    const replaced =
      avatarImageId !== undefined && avatarImageId !== user.avatarImageId
        ? user.avatarImage
        : null;
    if (avatarImageId !== undefined) {
      const image = avatarImageId
        ? await this.imagesService.findForUse(
            avatarImageId,
            ImagePurpose.AVATAR,
            userId,
          )
        : null;
      // The relation is set with the id: a loaded relation would otherwise
      // win over the changed column on save.
      user.avatarImageId = image?.id ?? null;
      user.avatarImage = image;
    }
    const saved = await this.userAuthRepository.save(user);
    if (replaced) {
      await this.imagesService.remove(replaced);
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Profile updated successfully',
      await this.toProfile(saved),
    );
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponseDto> {
    const user = await this.findUserOrThrow(userId);
    const matches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      BCRYPT_ROUNDS,
    );
    user.updatedById = userId;
    await this.userAuthRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Password changed successfully',
      null,
    );
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<ApiResponseDto> {
    let payload: { sid: number; userId: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.userSessionRepository.findLiveById(payload.sid);
    if (
      !session ||
      !(await bcrypt.compare(
        refreshTokenDto.refreshToken,
        session.refreshTokenHash,
      ))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.findUserOrThrow(session.userId);
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is not active');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      session.revokedAt = new Date();
      await this.userSessionRepository.save(session, queryRunner.manager);
      const tokens = await this.issueSession(user, queryRunner.manager);

      await queryRunner.commitTransaction();
      return new ApiResponseDto(HttpStatus.OK, 'Token refreshed successfully', {
        ...tokens,
        user: await this.toProfile(user),
      });
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        error.message || 'Could not refresh the session',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async logout(sessionId: number): Promise<ApiResponseDto> {
    const session = await this.userSessionRepository.findLiveById(sessionId);
    if (session) {
      session.revokedAt = new Date();
      await this.userSessionRepository.save(session);
    }
    return new ApiResponseDto(HttpStatus.OK, 'Logged out successfully', null);
  }

  private async issueSession(
    user: User,
    manager?: import('typeorm').EntityManager,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '30d',
    );

    const session: UserSession = this.userSessionRepository.create({
      userId: user.id,
      refreshTokenHash: '',
      expiresAt: new Date(Date.now() + this.toMilliseconds(refreshExpiresIn)),
      revokedAt: null,
      createdById: user.id,
    });
    const saved = await this.userSessionRepository.save(session, manager);

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      sid: saved.id,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: refreshExpiresIn as any,
    });

    saved.refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.userSessionRepository.save(saved, manager);

    return { accessToken, refreshToken };
  }

  /**
   * Gives the user a fresh 6-digit code for `purpose`, replacing any earlier
   * one. Only its hash is stored; the code itself goes back to the caller to
   * be texted.
   */
  private async issueOtp(
    userId: number,
    purpose: OtpPurpose,
    manager?: EntityManager,
  ): Promise<IssuedOtp> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expireMinutes = parseInt(
      this.configService.get<string>('OTP_EXPIRE_MINUTES', '10'),
      10,
    );

    await this.userOtpRepository.deleteByUserIdAndPurpose(
      userId,
      purpose,
      manager,
    );
    const saved = await this.userOtpRepository.save(
      this.userOtpRepository.create({
        userId,
        otpHash: await bcrypt.hash(otp, BCRYPT_ROUNDS),
        purpose,
        expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
      }),
      manager,
    );
    return { otp, otpId: saved.id, expireMinutes };
  }

  /** Queues the code's SMS; delivery happens in SmsConsumer, off the request path. */
  private sendOtp(
    phone: string,
    { otp, expireMinutes }: IssuedOtp,
    kind: 'verification' | 'password reset',
  ): Promise<void> {
    return this.smsService.sendSms(
      phone,
      `Your Waypoint ${kind} code is: ${otp}. Valid for ${expireMinutes} minutes.`,
    );
  }

  // Outside production the code is also returned, so a flow can be tried
  // without a phone to receive the SMS.
  private otpForTesting({ otp }: IssuedOtp): { otp?: string } {
    return process.env.NODE_ENV !== 'production' ? { otp } : {};
  }

  private async findUserOrThrow(userId: number): Promise<User> {
    const user = await this.userAuthRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  // Without the password hash, and with the profile picture as its URL.
  private toPublic(user: User) {
    const { passwordHash: _passwordHash, avatarImage, ...result } = user;
    return { ...result, avatar: avatarImage?.url ?? null };
  }

  /**
   * The user as a client sees it. A driver also gets the `driver` block the
   * handset works from: their code, home depot and the vehicle they are on.
   */
  private async toProfile(user: User) {
    const profile = this.toPublic(user);
    if (user.role !== UserRole.DRIVER) {
      return profile;
    }
    const [depot, vehicle] = await Promise.all([
      this.depotsRepository.findById(user.depotId),
      this.userAuthRepository.findVehicleOfDriver(user.id),
    ]);

    return {
      ...profile,
      driver: {
        code: `DRV-${String(user.id).padStart(4, '0')}`,
        depot: depot?.name ?? null,
        depotLocation:
          depot?.lat != null && depot.lng != null
            ? { lat: depot.lat, lng: depot.lng }
            : null,
        vehicle: vehicle && {
          id: vehicle.id,
          plate: vehicle.uniqueId,
          type: vehicleLabel(vehicle),
        },
      },
    };
  }

  private toMilliseconds(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) {
      throw new BadRequestException(
        `JWT_REFRESH_EXPIRES_IN must look like 30d, 12h, 45m or 30s (got "${duration}")`,
      );
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return amount * unitMs[unit as keyof typeof unitMs];
  }
}
