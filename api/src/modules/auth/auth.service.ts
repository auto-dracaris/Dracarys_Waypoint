import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { PermissionResolutionService } from '../../common/services/permission-resolution.service';
import { User } from '../../database/entities/user.entity';
import { UserSession } from '../../database/entities/user-session.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UserAuthRepository } from './repositories/user-auth.repository';
import { UserSessionRepository } from './repositories/user-session.repository';

const BCRYPT_ROUNDS = 10;

/**
 * Every method here is a bespoke flow rather than plain CRUD, so this service
 * deliberately does not extend `BaseCrudService`.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userAuthRepository: UserAuthRepository,
    private readonly userSessionRepository: UserSessionRepository,
    private readonly permissionResolutionService: PermissionResolutionService,
  ) {}

  async login(loginDto: LoginDto): Promise<ApiResponseDto> {
    const user = await this.userAuthRepository.findByEmail(loginDto.email);
    // One message for both "no such email" and "wrong password", so the
    // endpoint can't be used to enumerate accounts.
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is not active');
    }

    const tokens = await this.issueSession(user);

    return new ApiResponseDto(HttpStatus.OK, 'Logged in successfully', {
      ...tokens,
      user: this.toPublic(user),
    });
  }

  async me(userId: number): Promise<ApiResponseDto> {
    const user = await this.findUserOrThrow(userId);
    const { effective } = await this.permissionResolutionService.resolveForUser(
      user.id,
      user.role,
    );

    return new ApiResponseDto(HttpStatus.OK, 'Profile retrieved successfully', {
      ...this.toPublic(user),
      permissions: effective,
    });
  }

  async updateMe(
    userId: number,
    updateMeDto: UpdateMeDto,
  ): Promise<ApiResponseDto> {
    const user = await this.findUserOrThrow(userId);
    Object.assign(user, updateMeDto);
    user.updatedBy = String(userId);
    const saved = await this.userAuthRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Profile updated successfully',
      this.toPublic(saved),
    );
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponseDto> {
    const user = await this.findUserOrThrow(userId);
    const matches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(
      changePasswordDto.newPassword,
      BCRYPT_ROUNDS,
    );
    user.updatedBy = String(userId);
    await this.userAuthRepository.save(user);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Password changed successfully',
      null,
    );
  }

  /**
   * Rotates the session: the presented refresh token is verified against the
   * stored hash, that session is revoked, and a fresh pair is issued. Replaying
   * an already-rotated token therefore fails, because its session is no longer
   * live.
   */
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
        user: this.toPublic(user),
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

  /**
   * Creates the session row first so its id can go into both tokens as `sid`,
   * then stores the hash of the refresh token on that same row.
   */
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
      createBy: String(user.id),
    });
    const saved = await this.userSessionRepository.save(session, manager);

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sid: saved.id,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      // `as any` because @types/jsonwebtoken types `expiresIn` as a literal
      // union of duration strings, which an env-supplied string can't satisfy.
      expiresIn: refreshExpiresIn as any,
    });

    saved.refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.userSessionRepository.save(saved, manager);

    return { accessToken, refreshToken };
  }

  private async findUserOrThrow(userId: number): Promise<User> {
    const user = await this.userAuthRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  /** Never return a user without stripping the password hash first. */
  private toPublic(user: User) {
    const { password: _password, ...result } = user;
    return result;
  }

  /** Accepts the `30d` / `12h` / `45m` / `30s` forms used in env. */
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
