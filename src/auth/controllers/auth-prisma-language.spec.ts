import { Test, TestingModule } from '@nestjs/testing';
import { AuthPrismaController } from './auth-prisma.controller';
import { AuthPrismaService } from '../services/auth-prisma.service';
import { UpdateLanguageDto } from '../dtos/update-language.dto';
import { Language } from '@prisma/client';

describe('AuthPrismaController - Language Preference', () => {
  let controller: AuthPrismaController;
  let service: AuthPrismaService;

  const mockAuthService = {
    updateLanguage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthPrismaController],
      providers: [
        {
          provide: AuthPrismaService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthPrismaController>(AuthPrismaController);
    service = module.get<AuthPrismaService>(AuthPrismaService);

    jest.clearAllMocks();
  });

  describe('updateLanguage', () => {
    it('should update language preference to FR', async () => {
      // Arrange
      const inputDto: UpdateLanguageDto = {
        language: Language.FR,
      };
      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'LEARNER',
        },
      };
      mockAuthService.updateLanguage.mockResolvedValue(undefined);

      // Act
      const actualResult = await controller.updateLanguage(mockRequest, inputDto);

      // Assert
      expect(service.updateLanguage).toHaveBeenCalledWith('user-123', Language.FR);
      expect(actualResult).toEqual({
        message: 'Language preference updated successfully',
        language: Language.FR,
      });
    });

    it('should update language preference to EN', async () => {
      // Arrange
      const inputDto: UpdateLanguageDto = {
        language: Language.EN,
      };
      const mockRequest = {
        user: {
          id: 'user-456',
          email: 'test2@example.com',
          role: 'INSTRUCTOR',
        },
      };
      mockAuthService.updateLanguage.mockResolvedValue(undefined);

      // Act
      const actualResult = await controller.updateLanguage(mockRequest, inputDto);

      // Assert
      expect(service.updateLanguage).toHaveBeenCalledWith('user-456', Language.EN);
      expect(actualResult).toEqual({
        message: 'Language preference updated successfully',
        language: Language.EN,
      });
    });

    it('should return success message with updated language', async () => {
      // Arrange
      const inputDto: UpdateLanguageDto = {
        language: Language.FR,
      };
      const mockRequest = {
        user: {
          id: 'user-789',
          email: 'test3@example.com',
          role: 'ADMIN',
        },
      };
      mockAuthService.updateLanguage.mockResolvedValue(undefined);

      // Act
      const actualResult = await controller.updateLanguage(mockRequest, inputDto);

      // Assert
      expect(actualResult).toHaveProperty('message');
      expect(actualResult).toHaveProperty('language');
      expect(actualResult.language).toBe(Language.FR);
    });

    it('should call service with correct user ID from JWT token', async () => {
      // Arrange
      const inputDto: UpdateLanguageDto = {
        language: Language.EN,
      };
      const mockRequest = {
        user: {
          id: 'specific-user-id',
          email: 'specific@example.com',
          role: 'LEARNER',
        },
      };
      mockAuthService.updateLanguage.mockResolvedValue(undefined);

      // Act
      await controller.updateLanguage(mockRequest, inputDto);

      // Assert
      expect(service.updateLanguage).toHaveBeenCalledWith(
        'specific-user-id',
        inputDto.language,
      );
    });
  });
});
