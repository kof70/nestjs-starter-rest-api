import { Test, TestingModule } from '@nestjs/testing';
import { LmsNavigationController } from './lms-navigation.controller';
import { LmsNavigationService } from '../services/lms-navigation.service';
import { ProgressService } from '../../progress/services/progress.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { UserRole, EnrollmentStatus, Language, ContentType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('LmsNavigationController', () => {
  let controller: LmsNavigationController;
  let lmsNavigationService: LmsNavigationService;
  let progressService: ProgressService;

  const mockLmsNavigationService = {
    getEnrolledCourses: jest.fn(),
    getCourseModules: jest.fn(),
    getModuleContent: jest.fn(),
  };

  const mockProgressService = {
    markContentCompleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LmsNavigationController],
      providers: [
        {
          provide: LmsNavigationService,
          useValue: mockLmsNavigationService,
        },
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

    controller = module.get<LmsNavigationController>(LmsNavigationController);
    lmsNavigationService = module.get<LmsNavigationService>(
      LmsNavigationService,
    );
    progressService = module.get<ProgressService>(ProgressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnrolledCourses', () => {
    it('should return enrolled courses for current user', async () => {
      const mockContext: RequestContext = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: UserRole.LEARNER,
        },
        requestID: 'req-1',
        url: '/lms/navigation',
        ip: '127.0.0.1',
      };

      const mockEnrolledCourses = [
        {
          id: 'course-1',
          title: 'Test Course',
          description: 'Test Description',
          language: Language.EN,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          enrollmentStatus: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date('2024-01-15'),
          progressPercentage: 45.5,
          completed: false,
        },
      ];

      mockLmsNavigationService.getEnrolledCourses.mockResolvedValue(
        mockEnrolledCourses,
      );

      const result = await controller.getEnrolledCourses(mockContext);

      expect(result).toEqual(mockEnrolledCourses);
      expect(mockLmsNavigationService.getEnrolledCourses).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  describe('getCourseModules', () => {
    it('should return course modules with prerequisite locking', async () => {
      const mockContext: RequestContext = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: UserRole.LEARNER,
        },
        requestID: 'req-1',
        url: '/lms/navigation',
        ip: '127.0.0.1',
      };

      const mockCourseId = 'course-1';
      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          description: 'First module',
          order: 1,
          prerequisiteId: null,
          locked: false,
          progressPercentage: 100,
          completed: true,
          totalItems: 5,
          completedItems: 5,
        },
        {
          id: 'module-2',
          title: 'Module 2',
          description: 'Second module',
          order: 2,
          prerequisiteId: 'module-1',
          locked: false,
          progressPercentage: 50,
          completed: false,
          totalItems: 4,
          completedItems: 2,
        },
      ];

      mockLmsNavigationService.getCourseModules.mockResolvedValue(mockModules);

      const result = await controller.getCourseModules(
        mockCourseId,
        mockContext,
      );

      expect(result).toEqual(mockModules);
      expect(mockLmsNavigationService.getCourseModules).toHaveBeenCalledWith(
        mockCourseId,
        'user-1',
      );
    });
  });

  describe('getModuleContent', () => {
    it('should return module content items with progress', async () => {
      const mockContext: RequestContext = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: UserRole.LEARNER,
        },
        requestID: 'req-1',
        url: '/lms/navigation',
        ip: '127.0.0.1',
      };

      const mockCourseId = 'course-1';
      const mockModuleId = 'module-1';
      const mockContentItems = [
        {
          id: 'content-1',
          title: 'Content 1',
          type: ContentType.TEXT,
          order: 1,
          mandatory: true,
          textContent: 'Test content',
          completed: true,
          timeSpent: 300,
          completedAt: new Date('2024-01-15'),
        },
        {
          id: 'content-2',
          title: 'Content 2',
          type: ContentType.VIDEO,
          order: 2,
          mandatory: false,
          videoUrl: 'https://example.com/video.mp4',
          completed: false,
          timeSpent: 0,
          completedAt: null,
        },
      ];

      mockLmsNavigationService.getModuleContent.mockResolvedValue(
        mockContentItems,
      );

      const result = await controller.getModuleContent(
        mockCourseId,
        mockModuleId,
        mockContext,
      );

      expect(result).toEqual(mockContentItems);
      expect(mockLmsNavigationService.getModuleContent).toHaveBeenCalledWith(
        mockCourseId,
        mockModuleId,
        'user-1',
      );
    });
  });

  describe('completeContent', () => {
    it('should mark content as completed with time spent', async () => {
      const mockContext: RequestContext = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: UserRole.LEARNER,
        },
        requestID: 'req-1',
        url: '/lms/navigation',
        ip: '127.0.0.1',
      };

      const mockCourseId = 'course-1';
      const mockContentItemId = 'content-1';
      const mockDto = { timeSpent: 300 };

      const mockProgress = {
        userId: 'user-1',
        contentItemId: mockContentItemId,
        moduleId: 'module-1',
        completed: true,
        timeSpent: 300,
        completedAt: new Date('2024-01-15'),
      };

      mockProgressService.markContentCompleted.mockResolvedValue(mockProgress);

      const result = await controller.completeContent(
        mockCourseId,
        mockContentItemId,
        mockDto,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.progress.contentItemId).toBe(mockContentItemId);
      expect(result.progress.completed).toBe(true);
      expect(result.progress.timeSpent).toBe(300);
      expect(mockProgressService.markContentCompleted).toHaveBeenCalledWith(
        mockContentItemId,
        'user-1',
        300,
      );
    });

    it('should mark content as completed without time spent', async () => {
      const mockContext: RequestContext = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: UserRole.LEARNER,
        },
        requestID: 'req-1',
        url: '/lms/navigation',
        ip: '127.0.0.1',
      };

      const mockCourseId = 'course-1';
      const mockContentItemId = 'content-1';
      const mockDto = {};

      const mockProgress = {
        userId: 'user-1',
        contentItemId: mockContentItemId,
        moduleId: 'module-1',
        completed: true,
        timeSpent: 0,
        completedAt: new Date('2024-01-15'),
      };

      mockProgressService.markContentCompleted.mockResolvedValue(mockProgress);

      const result = await controller.completeContent(
        mockCourseId,
        mockContentItemId,
        mockDto,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(mockProgressService.markContentCompleted).toHaveBeenCalledWith(
        mockContentItemId,
        'user-1',
        0,
      );
    });
  });
});
