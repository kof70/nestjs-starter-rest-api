import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
const bcrypt = require('bcrypt');
const crypto = require('crypto');
import { AuthPrismaService } from './auth-prisma.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditLogService } from './audit-log.service';

// Define UserRole enum for tests
enum UserRole {
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  LEARNER = 'LEARNER',
}

describe('AuthPrismaService', () => {
  let service: AuthPrismaService;
  let prismaService: any; // Use any for mocked PrismaService to avoid type issues
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.LEARNER,
    language: 'EN' as any,
    emailVerified: false,
    emailVerifyToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPrismaService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.minLoginResponseTime') return 100; // Fast for testing
              return undefined;
            }),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logAuthAttempt: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockResolvedValue('translated-message'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthPrismaService>(AuthPrismaService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    auditLogService = module.get(AuditLogService) as jest.Mocked<AuditLogService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should successfully register a new user with hashed password', async () => {
      // Requirement 1.1: Password hashing with bcrypt minimum 10 rounds
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.register(registerDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prismaService.user.create).toHaveBeenCalled();
      
      // Verify password was hashed
      const createCall = prismaService.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe(registerDto.password);
      expect(createCall.data.role).toBe(UserRole.LEARNER);
      expect(createCall.data.emailVerified).toBe(false);
      
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should hash password with minimum 10 rounds of bcrypt', async () => {
      // Requirement 1.1: Verify bcrypt rounds
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      await service.register(registerDto);

      expect(bcryptHashSpy).toHaveBeenCalledWith(registerDto.password, 10);
    });

    it('should throw ConflictException if user already exists', async () => {
      // Requirement 1.5: Email validation
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should validate email format and throw BadRequestException for invalid email', async () => {
      // Requirement 1.5: Email validation
      prismaService.user.findUnique.mockResolvedValue(null);

      const invalidEmailDto = { ...registerDto, email: 'invalid-email' };

      await expect(service.register(invalidEmailDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should successfully login with valid credentials', async () => {
      // Requirement 1.2: JWT token generation
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.role).toBe(UserRole.LEARNER);
    });

    it('should generate JWT token with 24-hour expiration', async () => {
      // Requirement 1.2: 24-hour token expiration
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        { expiresIn: '24h' },
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Requirement 1.3: Timing attack prevention
      prismaService.user.findUnique.mockResolvedValue(null);

      const startTime = Date.now();
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      const endTime = Date.now();

      // Verify minimum response time for timing attack prevention (100ms in tests)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Requirement 1.3: Timing attack prevention
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const startTime = Date.now();
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      const endTime = Date.now();

      // Verify minimum response time (100ms in tests)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should enforce minimum response time on successful login', async () => {
      // Requirement 1.3: Timing attack prevention
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const startTime = Date.now();
      await service.login(loginDto);
      const endTime = Date.now();

      // Even successful logins should take at least the minimum time (100ms in tests)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('validateUserById', () => {
    it('should return user when found', async () => {
      // Requirement 1.4: JWT token validation
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUserById('user-123');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should return null when user not found', async () => {
      // Requirement 1.4: JWT token validation
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('role support', () => {
    it('should support Admin role', async () => {
      // Requirement 1.5: Support for Admin, Instructor, and Learner roles
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      prismaService.user.findUnique.mockResolvedValue(adminUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login({
        email: 'admin@example.com',
        password: 'Password123!',
      });

      expect(result.user.role).toBe(UserRole.ADMIN);
    });

    it('should support Instructor role', async () => {
      // Requirement 1.5: Support for Admin, Instructor, and Learner roles
      const instructorUser = { ...mockUser, role: UserRole.INSTRUCTOR };
      prismaService.user.findUnique.mockResolvedValue(instructorUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login({
        email: 'instructor@example.com',
        password: 'Password123!',
      });

      expect(result.user.role).toBe(UserRole.INSTRUCTOR);
    });

    it('should default to Learner role on registration', async () => {
      // Requirement 1.5: Default role assignment
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      await service.register({
        email: 'newuser@example.com',
        password: 'Password123!',
      });

      const createCall = prismaService.user.create.mock.calls[0][0];
      expect(createCall.data.role).toBe(UserRole.LEARNER);
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate password reset token with 1-hour expiration', async () => {
      // Requirement 1.7: Password reset with 1-hour token expiration
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUser);

      const cryptoSpy = jest.spyOn(crypto, 'randomBytes');

      await service.requestPasswordReset('test@example.com');

      expect(cryptoSpy).toHaveBeenCalledWith(32);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date),
        }),
      });

      // Verify expiration is approximately 1 hour from now
      const updateCall = prismaService.user.update.mock.calls[0][0];
      const expirationTime = updateCall.data.passwordResetExpires.getTime();
      const expectedTime = Date.now() + 60 * 60 * 1000;
      expect(expirationTime).toBeGreaterThan(Date.now());
      expect(expirationTime).toBeLessThanOrEqual(expectedTime + 1000); // Allow 1 second tolerance
    });

    it('should not reveal if user does not exist (security)', async () => {
      // Requirement 1.7: Security best practice - don't reveal user existence
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset('nonexistent@example.com'),
      ).resolves.not.toThrow();

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should use cryptographically secure token generation', async () => {
      // Requirement 1.7: Cryptographically secure tokens
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUser);

      const cryptoSpy = jest.spyOn(crypto, 'randomBytes');

      await service.requestPasswordReset('test@example.com');

      expect(cryptoSpy).toHaveBeenCalledWith(32);
      const updateCall = prismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordResetToken).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  describe('resetPassword', () => {
    const validToken = 'valid-reset-token-123';
    const newPassword = 'NewPassword456!';

    it('should reset password with valid token', async () => {
      // Requirement 1.7: Password reset functionality
      const userWithToken = {
        ...mockUser,
        passwordResetToken: validToken,
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      };

      prismaService.user.findFirst.mockResolvedValue(userWithToken);
      prismaService.user.update.mockResolvedValue(mockUser);

      await service.resetPassword(validToken, newPassword);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          passwordResetToken: validToken,
          passwordResetExpires: {
            gt: expect.any(Date),
          },
        },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithToken.id },
        data: {
          password: expect.any(String),
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      // Verify password was hashed
      const updateCall = prismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.password).not.toBe(newPassword);
    });

    it('should hash new password with bcrypt', async () => {
      // Requirement 1.7: Password hashing
      const userWithToken = {
        ...mockUser,
        passwordResetToken: validToken,
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
      };

      prismaService.user.findFirst.mockResolvedValue(userWithToken);
      prismaService.user.update.mockResolvedValue(mockUser);

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      await service.resetPassword(validToken, newPassword);

      expect(bcryptHashSpy).toHaveBeenCalledWith(newPassword, 10);
    });

    it('should throw BadRequestException for invalid token', async () => {
      // Requirement 1.7: Token validation
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', newPassword),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for expired token', async () => {
      // Requirement 1.7: 1-hour expiration enforcement
      const userWithExpiredToken = {
        ...mockUser,
        passwordResetToken: validToken,
        passwordResetExpires: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      prismaService.user.findFirst.mockResolvedValue(null); // findFirst filters out expired tokens

      await expect(
        service.resetPassword(validToken, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear reset token after successful password reset', async () => {
      // Requirement 1.7: Token cleanup
      const userWithToken = {
        ...mockUser,
        passwordResetToken: validToken,
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
      };

      prismaService.user.findFirst.mockResolvedValue(userWithToken);
      prismaService.user.update.mockResolvedValue(mockUser);

      await service.resetPassword(validToken, newPassword);

      const updateCall = prismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordResetToken).toBeNull();
      expect(updateCall.data.passwordResetExpires).toBeNull();
    });

    it('should log password reset for audit', async () => {
      // Requirement 1.7: Audit logging
      const userWithToken = {
        ...mockUser,
        passwordResetToken: validToken,
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
      };

      prismaService.user.findFirst.mockResolvedValue(userWithToken);
      prismaService.user.update.mockResolvedValue(mockUser);

      await service.resetPassword(validToken, newPassword);

      expect(auditLogService.logAuthAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userWithToken.id,
          email: userWithToken.email,
          success: true,
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    const validToken = 'valid-email-token-abc';

    it('should verify email with valid token within 24 hours', async () => {
      // Requirement 1.6: Email verification within 24 hours
      const userWithToken = {
        ...mockUser,
        emailVerifyToken: validToken,
        emailVerified: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      };

      prismaService.user.findFirst.mockResolvedValue(userWithToken);
      prismaService.user.update.mockResolvedValue({ ...userWithToken, emailVerified: true });

      await service.verifyEmail(validToken);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          emailVerifyToken: validToken,
          emailVerified: false,
        },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithToken.id },
        data: {
          emailVerified: true,
          emailVerifyToken: null,
        },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      // Requirement 1.6: Token validation
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for expired token (>24 hours)', async () => {
      // Requirement 1.6: 24-hour expiration
      const userWithExpiredToken = {
        ...mockUser,
        emailVerifyToken: validToken,
        emailVerified: false,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      prismaService.user.findFirst.mockResolvedValue(userWithExpiredToken);

      await expect(service.verifyEmail(validToken)).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for already verified email', async () => {
      // Requirement 1.6: Prevent reuse of verification token
      prismaService.user.findFirst.mockResolvedValue(null); // Query filters out already verified

      await expect(service.verifyEmail(validToken)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should clear verification token after successful verification', async () => {
      // Requirement 1.6: Token cleanup
      const userWithToken = {
        ...mockUser,
        emailVerifyToken: validToken,
        emailVerified: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      };

      prismaService.user.findFirst.mockResolvedValue(userWithToken);
      prismaService.user.update.mockResolvedValue({ ...userWithToken, emailVerified: true });

      await service.verifyEmail(validToken);

      const updateCall = prismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.emailVerifyToken).toBeNull();
      expect(updateCall.data.emailVerified).toBe(true);
    });

    it('should generate email verification token on registration', async () => {
      // Requirement 1.6: Token generation during registration
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const cryptoSpy = jest.spyOn(crypto, 'randomBytes');

      await service.register({
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(cryptoSpy).toHaveBeenCalledWith(32);
      const createCall = prismaService.user.create.mock.calls[0][0];
      expect(createCall.data.emailVerifyToken).toBeDefined();
      expect(createCall.data.emailVerifyToken).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  describe('password comparison edge cases', () => {
    it('should handle empty password gracefully', async () => {
      // Requirement 1.1: Password validation
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'test@example.com', password: '' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle very long passwords', async () => {
      // Requirement 1.1: Password handling
      const longPassword = 'a'.repeat(1000);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'test@example.com', password: longPassword }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle special characters in passwords', async () => {
      // Requirement 1.1: Password handling
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login({
        email: 'test@example.com',
        password: specialPassword,
      });

      expect(result.accessToken).toBe('mock-jwt-token');
    });
  });

  describe('JWT token validation edge cases', () => {
    it('should include all required fields in JWT payload', async () => {
      // Requirement 1.2: JWT token structure
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const signCall = jwtService.sign.mock.calls[0][0] as any;
      expect(signCall).toHaveProperty('sub');
      expect(signCall).toHaveProperty('email');
      expect(signCall).toHaveProperty('role');
      expect(signCall.sub).toBe(mockUser.id);
      expect(signCall.email).toBe(mockUser.email);
      expect(signCall.role).toBe(mockUser.role);
    });

    it('should not include sensitive data in JWT payload', async () => {
      // Requirement 1.2: JWT security
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const signCall = jwtService.sign.mock.calls[0][0] as any;
      expect(signCall).not.toHaveProperty('password');
      expect(signCall).not.toHaveProperty('passwordResetToken');
      expect(signCall).not.toHaveProperty('emailVerifyToken');
    });
  });

  describe('timing attack prevention comprehensive tests', () => {
    it('should maintain consistent timing for different error types', async () => {
      // Requirement 1.3: Timing attack prevention
      const timings: number[] = [];

      // Test user not found
      prismaService.user.findUnique.mockResolvedValue(null);
      const start1 = Date.now();
      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'test' }),
      ).rejects.toThrow();
      timings.push(Date.now() - start1);

      // Test wrong password
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      const start2 = Date.now();
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow();
      timings.push(Date.now() - start2);

      // All timings should be at least MIN_LOGIN_RESPONSE_TIME
      timings.forEach((timing) => {
        expect(timing).toBeGreaterThanOrEqual(100); // 100ms in tests
      });

      // Timings should be similar (within 50ms tolerance)
      const maxDiff = Math.max(...timings) - Math.min(...timings);
      expect(maxDiff).toBeLessThan(50);
    });

    it('should apply timing delay even on database errors', async () => {
      // Requirement 1.3: Timing attack prevention on errors
      prismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const start = Date.now();
      await expect(
        service.login({ email: 'test@example.com', password: 'test' }),
      ).rejects.toThrow();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });

  describe('role-based authorization comprehensive tests', () => {
    it('should preserve role information through authentication flow', async () => {
      // Requirement 1.5: Role preservation
      const roles = [UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.LEARNER];

      for (const role of roles) {
        const userWithRole = { ...mockUser, role };
        prismaService.user.findUnique.mockResolvedValue(userWithRole);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
        jwtService.sign.mockReturnValue('mock-jwt-token');

        const result = await service.login({
          email: 'test@example.com',
          password: 'Password123!',
        });

        expect(result.user.role).toBe(role);
        const signCall = jwtService.sign.mock.calls[jwtService.sign.mock.calls.length - 1][0] as any;
        expect(signCall.role).toBe(role);
      }
    });
  });

  describe('audit logging integration', () => {
    it('should log successful login with IP and user agent', async () => {
      // Requirement 11.3: Audit logging
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      await service.login(
        { email: 'test@example.com', password: 'Password123!' },
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(auditLogService.logAuthAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: true,
        }),
      );
    });

    it('should log failed login attempts with reason', async () => {
      // Requirement 11.3: Audit logging
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'wrong' },
          '192.168.1.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow();

      expect(auditLogService.logAuthAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: false,
          failureReason: 'Invalid password',
        }),
      );
    });

    it('should handle missing IP and user agent gracefully', async () => {
      // Requirement 11.3: Audit logging with defaults
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      await service.login({ email: 'test@example.com', password: 'Password123!' });

      expect(auditLogService.logAuthAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: 'unknown',
          userAgent: undefined,
        }),
      );
    });
  });
});
