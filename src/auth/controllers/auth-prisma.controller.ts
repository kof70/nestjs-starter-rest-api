import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthPrismaService } from '../services/auth-prisma.service';
import { LoginDto } from '../dtos/auth-login-prisma.dto';
import { RegisterDto } from '../dtos/auth-register-prisma.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { RequestPasswordResetDto } from '../dtos/request-password-reset.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { VerifyEmailDto } from '../dtos/verify-email.dto';
import { UpdateLanguageDto } from '../dtos/update-language.dto';
import { JwtPrismaAuthGuard } from '../guards/jwt-prisma-auth.guard';

@ApiTags('auth-prisma')
@Controller('auth-prisma')
export class AuthPrismaController {
  constructor(private readonly authService: AuthPrismaService) {}

  /**
   * Register a new user
   * Requirements: 1.1, 1.5
   */
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with email validation. Default role is LEARNER.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email format or validation error',
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Login user
   * Requirements: 1.2, 1.3, 11.3
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user and return JWT token. Implements timing attack prevention with minimum 3-second response time.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() dto: LoginDto, @Request() req: any): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ipAddress, userAgent);
  }

  /**
   * Get current user profile (protected endpoint)
   * Requirements: 1.4
   */
  @Get('me')
  @UseGuards(JwtPrismaAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user profile. Requires valid JWT token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  async getProfile(@Request() req: any) {
    return {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      language: req.user.language,
    };
  }

  /**
   * Request password reset
   * Requirements: 1.7
   */
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Generate a password reset token valid for 1 hour and send it via email. Returns success even if email does not exist (security best practice).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent if user exists',
  })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(dto.email);
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password with token
   * Requirements: 1.7
   */
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Reset user password using the token received via email. Token is valid for 1 hour.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password successfully reset',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired token',
  })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return {
      message: 'Password successfully reset. You can now login with your new password.',
    };
  }

  /**
   * Verify email with token
   * Requirements: 1.6
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verify user email address using the token received during registration. Token is valid for 24 hours.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email successfully verified',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid, expired, or already used token',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.authService.verifyEmail(dto.token);
    return {
      message: 'Email successfully verified.',
    };
  }

  /**
   * Update user language preference
   * Requirements: 9.2
   */
  @Patch('me/language')
  @UseGuards(JwtPrismaAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user language preference',
    description:
      'Update the authenticated user language preference. Supports FR (French) and EN (English).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Language preference updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid language value',
  })
  async updateLanguage(
    @Request() req: any,
    @Body() dto: UpdateLanguageDto,
  ): Promise<{ message: string; language: string }> {
    await this.authService.updateLanguage(req.user.id, dto.language);
    return {
      message: 'Language preference updated successfully',
      language: dto.language,
    };
  }
}
