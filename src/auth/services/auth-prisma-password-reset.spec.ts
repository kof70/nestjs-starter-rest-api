import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthPrismaService } from './auth-prisma.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from './audit-log.service';
import { I18nService } from 'nestjs-i18n';

describe('AuthPrismaService - Password Reset & Email Verification', () => {
  let service: AuthPrismaService;
  let prismaService: any;
  let auditLogService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'LEARNER',
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
          useValue: { sign: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 100),
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
    auditLogService = module.get(AuditLogService);
  });

  describe('requestPasswordReset', () => {
    it('should generate secure token with 1-hour expiration', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUser);

      await service.requestPasswordReset('test@example.com');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date),
        }),
      });
    });

    it('should not reveal if user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset('nonexistent@example.com'),
      ).resolves.not.toThrow();

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const userWithToken = {
        ...mockUser,
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
      };

      prismaService.user.findFirst.mockResolvedValue(userWithToken);
      prismaService.user.update.mockResolvedValue(mockUser);

      await service.resetPassword('valid-token', 'NewPassword123');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithToken.id },
        data: expect.objectContaining({
          password: expect.any(String),
          passwordResetToken: null,
          passwordResetExpires: null,
        }),
      });
    });

    it('should throw error for invalid token', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPassword123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const userWithToken = {
        ...mockUser,
        emailVerifyToken: 'valid-token',
        emailVerified: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      };

      prismaService.user.findFirst.mockResolvedValue(userWithToken);
      prismaService.user.update.mockResolvedValue({ ...userWithToken, emailVerified: true });

      await service.verifyEmail('valid-token');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithToken.id },
        data: {
          emailVerified: true,
          emailVerifyToken: null,
        },
      });
    });

    it('should throw error for expired token (>24 hours)', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        emailVerifyToken: 'valid-token',
        emailVerified: false,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      prismaService.user.findFirst.mockResolvedValue(userWithExpiredToken);

      await expect(service.verifyEmail('valid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
