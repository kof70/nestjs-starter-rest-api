import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { LoginDto } from '../dtos/auth-login-prisma.dto';
import { RegisterDto } from '../dtos/auth-register-prisma.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { AuditLogService } from './audit-log.service';
import { User, UserRole, Language } from '@prisma/client';

@Injectable()
export class AuthPrismaService {
  private readonly BCRYPT_ROUNDS = 10;
  private readonly MIN_LOGIN_RESPONSE_TIME: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly i18n: I18nService,
  ) {
    this.MIN_LOGIN_RESPONSE_TIME =
      this.configService.get<number>('auth.minLoginResponseTime') || 3000;
  }

  /**
   * Register a new user
   * Requirements: 1.1, 1.5, 1.6
   */
  async register(dto: RegisterDto, lang: Language = Language.EN): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException(
        await this.i18n.translate('common.errors.userWithEmailExists', { lang }),
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new BadRequestException(
        await this.i18n.translate('common.errors.invalidEmailFormat', { lang }),
      );
    }

    // Hash password with bcrypt (minimum 10 rounds)
    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Generate email verification token (24-hour expiration)
    const emailVerifyToken = this.generateSecureToken();

    // Create user with default LEARNER role
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.LEARNER,
        emailVerified: false,
        emailVerifyToken,
      },
    });

    // TODO: Send email verification email (mock for now)
    // In production, this would send an email with the verification link
    console.log(`Email verification token for ${user.email}: ${emailVerifyToken}`);

    // Generate JWT token
    const accessToken = this.generateJwtToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Login user with timing attack prevention and audit logging
   * Requirements: 1.2, 1.3, 11.3
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string, lang: Language = Language.EN): Promise<AuthResponseDto> {
    const startTime = Date.now();
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (!user) {
        await this.auditLogService.logAuthAttempt({
          email: dto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent,
          success: false,
          failureReason: 'User not found',
        });
        await this.ensureMinimumResponseTime(startTime);
        throw new UnauthorizedException(
          await this.i18n.translate('common.errors.invalidCredentials', { lang }),
        );
      }
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        await this.auditLogService.logAuthAttempt({
          userId: user.id,
          email: dto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent,
          success: false,
          failureReason: 'Invalid password',
        });
        await this.ensureMinimumResponseTime(startTime);
        throw new UnauthorizedException(
          await this.i18n.translate('common.errors.invalidCredentials', { lang }),
        );
      }

      // Log successful authentication
      await this.auditLogService.logAuthAttempt({
        userId: user.id,
        email: dto.email,
        ipAddress: ipAddress || 'unknown',
        userAgent,
        success: true,
      });

      // Ensure minimum response time before returning success
      await this.ensureMinimumResponseTime(startTime);

      // Generate JWT token
      const accessToken = this.generateJwtToken(user);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    } catch (error) {
      // Ensure minimum response time even on error
      await this.ensureMinimumResponseTime(startTime);
      throw error;
    }
  }

  /**
   * Generate JWT token with 24-hour expiration
   * Requirements: 1.2, 1.4
   */
  private generateJwtToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      language: user.language,
    };
    return this.jwtService.sign(payload, {
      expiresIn: '24h',
    });
  }

  /**
   * Ensure minimum response time to prevent timing attacks
   * Requirements: 1.3
   */
  private async ensureMinimumResponseTime(startTime: number): Promise<void> {
    const elapsedTime = Date.now() - startTime;
    const remainingTime = this.MIN_LOGIN_RESPONSE_TIME - elapsedTime;

    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  }

  /**
   * Validate user by ID (for JWT strategy)
   * Requirements: 1.4
   */
  async validateUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Generate cryptographically secure token
   * Used for password reset and email verification
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Request password reset
   * Requirements: 1.7
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Still return success to prevent email enumeration
      return;
    }

    // Generate password reset token with 1-hour expiration
    const passwordResetToken = this.generateSecureToken();
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token and expiration in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // TODO: Send password reset email (mock for now)
    // In production, this would send an email with the reset link
    console.log(`Password reset token for ${user.email}: ${passwordResetToken}`);
    console.log(`Token expires at: ${passwordResetExpires.toISOString()}`);
  }

  /**
   * Reset password using token
   * Requirements: 1.7
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find user with valid token
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Log password reset for audit
    await this.auditLogService.logAuthAttempt({
      userId: user.id,
      email: user.email,
      ipAddress: 'system',
      success: true,
      failureReason: 'Password reset completed',
    });
  }

  /**
   * Verify email using token
   * Requirements: 1.6
   */
  async verifyEmail(token: string): Promise<void> {
    // Find user with matching verification token
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerified: false,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or already used email verification token');
    }

    // Check if token is within 24-hour window (from user creation)
    const tokenAge = Date.now() - user.createdAt.getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (tokenAge > twentyFourHours) {
      throw new BadRequestException('Email verification token has expired');
    }

    // Mark email as verified and clear token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
      },
    });
  }

  /**
   * Update user language preference
   * Requirements: 9.2
   */
  async updateLanguage(userId: string, language: Language): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { language },
    });
  }
}
