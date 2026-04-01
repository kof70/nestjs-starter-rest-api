import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthPrismaService } from './auth-prisma.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditLogService } from './audit-log.service';
import { I18nService } from 'nestjs-i18n';
import { Language } from '@prisma/client';

describe('AuthPrismaService - Language Preference', () => {
  let service: AuthPrismaService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'LEARNER',
    language: Language.EN,
    emailVerified: true,
    emailVerifyToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuditLogService = {
    logAuthAttempt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPrismaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
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
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('updateLanguage', () => {
    it('should update user language preference to FR', async () => {
      // Arrange
      const inputUserId = 'user-123';
      const inputLanguage = Language.FR;
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        language: Language.FR,
      });

      // Act
      await service.updateLanguage(inputUserId, inputLanguage);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: inputUserId },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: inputUserId },
        data: { language: inputLanguage },
      });
    });

    it('should update user language preference to EN', async () => {
      // Arrange
      const inputUserId = 'user-456';
      const inputLanguage = Language.EN;
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        id: inputUserId,
        language: Language.FR,
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        id: inputUserId,
        language: Language.EN,
      });

      // Act
      await service.updateLanguage(inputUserId, inputLanguage);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: inputUserId },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: inputUserId },
        data: { language: inputLanguage },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const inputUserId = 'non-existent-user';
      const inputLanguage = Language.FR;
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateLanguage(inputUserId, inputLanguage)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: inputUserId },
      });
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should persist language preference in database', async () => {
      // Arrange
      const inputUserId = 'user-789';
      const inputLanguage = Language.FR;
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        language: Language.FR,
      });

      // Act
      await service.updateLanguage(inputUserId, inputLanguage);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: inputUserId },
        data: { language: inputLanguage },
      });
    });
  });
});
