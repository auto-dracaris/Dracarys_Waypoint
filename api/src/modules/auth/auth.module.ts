import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsModule } from '../../common/sms/sms.module';
import { UserOtp } from '../../database/entities/user-otp.entity';
import { UserSession } from '../../database/entities/user-session.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserAuthRepository } from './repositories/user-auth.repository';
import { UserOtpRepository } from './repositories/user-otp.repository';
import { UserSessionRepository } from './repositories/user-session.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSession, UserOtp]),
    PassportModule,
    SmsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
            '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    UserAuthRepository,
    UserSessionRepository,
    UserOtpRepository,
  ],
  exports: [AuthService, UserSessionRepository, UserOtpRepository],
})
export class AuthModule {}
