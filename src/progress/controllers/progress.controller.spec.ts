import { Test, TestingModule } from '@nestjs/testing';
import { ProgressController } from './progress.controller';
import { ProgressService } from '../services/progress.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { ProgressAuthedRequest } from './progress.controller';

describe('ProgressController', () => {
  let controller: ProgressController;
  let service: ProgressService;

  const mockProgressService = {
    getProgressDashboard: jest.fn(),
    getContentProgress: jest.fn(),
    getModuleProgress: jest.fn(),
    getCourseProgress: jest.fn(),
    markContentCompleted: jest.fn(),
    trackTimeSpent: jest.fn(),
    syncOfflineProgress: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: 'user-1',
      email: 'test@example.com',
      role: UserRole.LEARNER,
    },
  } as unknown as ProgressAuthedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [
        {
          provide: ProgressService,
          useValue: mockProgressService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<ProgressController>(ProgressController);
    service = module.get<ProgressService>(ProgressService);
    jest.clearAllMocks();
  });

  describe('getProgressDashboard', () => {
    it('should return progress dashboard', async () => {
      const mockDashboard = [
        {
          courseId: 'course-1',
          courseTitle: 'Test Course',
          enrolledAt: new Date(),
          completionPercentage: 50,
          completed: false,
          totalItems: 10,
          completedItems: 5,
          timeSpent: 3600,
          estimatedTimeRemaining: 3600,
        },
      ];
      mockProgressService.getProgressDashboard.mockResolvedValue(mockDashboard);
      const result = await controller.getProgressDashboard(mockRequest);
      expect(result).toEqual(mockDashboard);
      expect(mockProgressService.getProgressDashboard).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getContentProgress', () => {
    it('should return content progress', async () => {
      const contentItemId = 'content-1';
      const mockProgress = {
        userId: 'user-1',
        contentItemId,
        completed: true,
        timeSpent: 300,
        completedAt: new Date(),
      };
      mockProgressService.getContentProgress.mockResolvedValue(mockProgress);
      const result = await controller.getContentProgress(contentItemId, mockRequest);
      expect(result).toEqual(mockProgress);
      expect(mockProgressService.getContentProgress).toHaveBeenCalledWith(
        contentItemId,
        'user-1',
      );
    });
  });

  describe('getModuleProgress', () => {
    it('should return module progress', async () => {
      const moduleId = 'module-1';
      const mockProgress = {
        moduleId,
        completed: false,
        completionPercentage: 50,
        totalItems: 4,
        completedItems: 2,
      };
      mockProgressService.getModuleProgress.mockResolvedValue(mockProgress);
      const result = await controller.getModuleProgress(moduleId, mockRequest);
      expect(result).toEqual(mockProgress);
      expect(mockProgressService.getModuleProgress).toHaveBeenCalledWith(
        moduleId,
        'user-1',
      );
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress', async () => {
      const courseId = 'course-1';
      const mockProgress = {
        courseId,
        completed: false,
        completionPercentage: 75,
        totalItems: 20,
        completedItems: 15,
      };
      mockProgressService.getCourseProgress.mockResolvedValue(mockProgress);
      const result = await controller.getCourseProgress(courseId, mockRequest);
      expect(result).toEqual(mockProgress);
      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(
        courseId,
        'user-1',
      );
    });
  });

  describe('markContentCompleted', () => {
    it('should mark content as completed', async () => {
      const contentItemId = 'content-1';
      const trackTimeDto = { timeSpent: 120 };
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        contentItemId,
        moduleId: 'module-1',
        completed: true,
        timeSpent: 120,
        completedAt: new Date(),
      };
      mockProgressService.markContentCompleted.mockResolvedValue(mockProgress);
      const result = await controller.markContentCompleted(
        contentItemId,
        trackTimeDto,
        mockRequest,
      );
      expect(result).toEqual(mockProgress);
      expect(mockProgressService.markContentCompleted).toHaveBeenCalledWith(
        contentItemId,
        'user-1',
        120,
      );
    });
  });

  describe('trackTimeSpent', () => {
    it('should track time spent on content', async () => {
      const contentItemId = 'content-1';
      const trackTimeDto = { timeSpent: 60 };
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        contentItemId,
        moduleId: 'module-1',
        completed: false,
        timeSpent: 60,
      };
      mockProgressService.trackTimeSpent.mockResolvedValue(mockProgress);
      const result = await controller.trackTimeSpent(
        contentItemId,
        trackTimeDto,
        mockRequest,
      );
      expect(result).toEqual(mockProgress);
      expect(mockProgressService.trackTimeSpent).toHaveBeenCalledWith(
        contentItemId,
        'user-1',
        60,
      );
    });
  });

  describe('syncOfflineProgress', () => {
    it('should sync offline progress successfully', async () => {
      const syncDto = {
        progressData: [
          {
            contentItemId: 'content-1',
            timeSpent: 100,
            completed: true,
            timestamp: '2024-01-15T10:30:00Z',
          },
        ],
      };
      const mockResult = {
        synced: 1,
        failed: 0,
        errors: [],
      };
      mockProgressService.syncOfflineProgress.mockResolvedValue(mockResult);
      const result = await controller.syncOfflineProgress(syncDto, mockRequest);
      expect(result).toEqual(mockResult);
      expect(mockProgressService.syncOfflineProgress).toHaveBeenCalledWith(
        'user-1',
        expect.arrayContaining([
          expect.objectContaining({
            contentItemId: 'content-1',
            timeSpent: 100,
            completed: true,
            timestamp: expect.any(Date),
          }),
        ]),
      );
    });

    it('should handle sync failures', async () => {
      const syncDto = {
        progressData: [
          {
            contentItemId: 'content-1',
            timeSpent: 100,
            completed: true,
            timestamp: '2024-01-15T10:30:00Z',
          },
        ],
      };
      const mockResult = {
        synced: 0,
        failed: 1,
        errors: ['Content item content-1 not found'],
      };
      mockProgressService.syncOfflineProgress.mockResolvedValue(mockResult);
      const result = await controller.syncOfflineProgress(syncDto, mockRequest);
      expect(result).toEqual(mockResult);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});
