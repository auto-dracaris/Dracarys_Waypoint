import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<ApiResponseDto> {
    return this.authService.register(registerDto);
  }

  // only for registration
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<ApiResponseDto> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  // only for registration
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() resendOtpDto: ResendOtpDto): Promise<ApiResponseDto> {
    return this.authService.resendOtp(resendOtpDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ApiResponseDto> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ApiResponseDto> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<ApiResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<ApiResponseDto> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser('sessionId') sessionId: number): Promise<ApiResponseDto> {
    return this.authService.logout(sessionId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('userId') userId: number): Promise<ApiResponseDto> {
    return this.authService.me(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser('userId') userId: number,
    @Body() updateMeDto: UpdateMeDto,
  ): Promise<ApiResponseDto> {
    return this.authService.updateMe(userId, updateMeDto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser('userId') userId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponseDto> {
    return this.authService.changePassword(userId, changePasswordDto);
  }
}
