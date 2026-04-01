import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CertificateService } from '../../certificate/services/certificate.service';
import { EnrollmentStatus, ContentType } from '@prisma/client';

describe('ProgressService', () => {
  let service: ProgressService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    contentItem: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    progress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    module: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CertificateService,
          useValue: {
            canGenerateCertificate: jest.fn(),
            generateCertificate: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<ProgressService>(ProgressService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getContentProgress', () => {
    const userId = 'user-1';
    const contentItemId = 'content-1';

    it('should return progress when it exists', async () => {
      const mockContentItem = {
        id: contentItemId,
        title: 'Test Content',
        type: ContentType.TEXT,
        order: 1,
        mandatory: true,
        moduleId: 'module-1',
      };
      const mockProgress = {
        id: 'progress-1',
        userId,
        contentItemId,
        moduleId: 'module-1',
        completed: true,
        completedAt: new Date(),
        timeSpent: 300,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.progress.findUnique.mockResolvedValue(mockProgress);
      const result = await service.getContentProgress(contentItemId, userId);
      expect(result).toEqual(mockProgress);
      expect(mockPrismaService.contentItem.findUnique).toHaveBeenCalledWith({
        where: { id: contentItemId },
      });
    });

    it('should return default progress when none exists', async () => {
      const mockContentItem = {
        id: contentItemId,
        title: 'Test Content',
        type: ContentType.TEXT,
        order: 1,
        mandatory: true,
        moduleId: 'module-1',
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.progress.findUnique.mockResolvedValue(null);
      const result = await service.getContentProgress(contentItemId, userId);
      expect(result).toEqual({
        userId,
        contentItemId,
        completed: false,
        timeSpent: 0,
        completedAt: null,
      });
    });

    it('should throw NotFoundException when content item does not exist', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(null);
      await expect(
        service.getContentProgress(contentItemId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getModuleProgress', () => {
    const userId = 'user-1';
    const moduleId = 'module-1';

    it('should calculate module progress correctly', async () => {
      const mockModule = {
        id: moduleId,
        title: 'Test Module',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
          { id: 'content-3', mandatory: false },
        ],
      };
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(1);
      const result = await service.getModuleProgress(moduleId, userId);
      expect(result).toEqual({
        moduleId,
        completed: false,
        completionPercentage: 50,
        totalItems: 2,
        completedItems: 1,
      });
    });

    it('should return 100% when no mandatory items exist', async () => {
      const mockModule = {
        id: moduleId,
        title: 'Test Module',
        contentItems: [
          { id: 'content-1', mandatory: false },
          { id: 'content-2', mandatory: false },
        ],
      };
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      const result = await service.getModuleProgress(moduleId, userId);
      expect(result).toEqual({
        moduleId,
        completed: true,
        completionPercentage: 100,
        totalItems: 0,
        completedItems: 0,
      });
    });

    it('should throw NotFoundException when module does not exist', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);
      await expect(
        service.getModuleProgress(moduleId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCourseProgress', () => {
    const userId = 'user-1';
    const courseId = 'course-1';

    it('should calculate course progress correctly', async () => {
      const mockCourse = {
        id: courseId,
        title: 'Test Course',
        modules: [
          {
            id: 'module-1',
            contentItems: [
              { id: 'content-1', mandatory: true },
              { id: 'content-2', mandatory: true },
            ],
          },
          {
            id: 'module-2',
            contentItems: [
              { id: 'content-3', mandatory: true },
              { id: 'content-4', mandatory: false },
            ],
          },
        ],
      };
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);
      const result = await service.getCourseProgress(courseId, userId);
      expect(result).toEqual({
        courseId,
        completed: false,
        completionPercentage: 66.66666666666666,
        totalItems: 3,
        completedItems: 2,
      });
    });

    it('should throw NotFoundException when course does not exist', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);
      await expect(
        service.getCourseProgress(courseId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('trackTimeSpent', () => {
    const userId = 'user-1';
    const contentItemId = 'content-1';
    const timeSpent = 120;

    it('should track time spent successfully', async () => {
      const mockContentItem = {
        id: contentItemId,
        moduleId: 'module-1',
        module: {
          id: 'module-1',
          courseId: 'course-1',
        },
      };
      const mockEnrollment = {
        id: 'enrollment-1',
        userId,
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
      };
      const mockProgress = {
        id: 'progress-1',
        userId,
        contentItemId,
        moduleId: 'module-1',
        timeSpent: 120,
        completed: false,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.progress.upsert.mockResolvedValue(mockProgress);
      const result = await service.trackTimeSpent(contentItemId, userId, timeSpent);
      expect(result).toEqual(mockProgress);
      expect(mockPrismaService.progress.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException when content item does not exist', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(null);
      await expect(
        service.trackTimeSpent(contentItemId, userId, timeSpent),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not enrolled', async () => {
      const mockContentItem = {
        id: contentItemId,
        moduleId: 'module-1',
        module: {
          id: 'module-1',
          courseId: 'course-1',
        },
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.trackTimeSpent(contentItemId, userId, timeSpent),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('syncOfflineProgress', () => {
    const userId = 'user-1';

    it('should sync offline progress successfully', async () => {
      const progressData = [
        {
          contentItemId: 'content-1',
          timeSpent: 100,
          completed: true,
          timestamp: new Date(),
        },
      ];
      const mockContentItem = {
        id: 'content-1',
        moduleId: 'module-1',
        module: {
          id: 'module-1',
          courseId: 'course-1',
        },
      };
      const mockEnrollment = {
        id: 'enrollment-1',
        userId,
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.progress.upsert.mockResolvedValue({});
      mockPrismaService.module.findUnique.mockResolvedValue({
        id: 'module-1',
        contentItems: [{ id: 'content-1', mandatory: true }],
      });
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        modules: [
          {
            id: 'module-1',
            contentItems: [{ id: 'content-1', mandatory: true }],
          },
        ],
      });
      mockPrismaService.enrollment.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.syncOfflineProgress(userId, progressData);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle sync failures gracefully', async () => {
      const progressData = [
        {
          contentItemId: 'content-1',
          timeSpent: 100,
          completed: true,
          timestamp: new Date(),
        },
      ];
      mockPrismaService.contentItem.findUnique.mockResolvedValue(null);
      const result = await service.syncOfflineProgress(userId, progressData);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('should handle enrollment validation failures', async () => {
      const progressData = [
        {
          contentItemId: 'content-1',
          timeSpent: 100,
          completed: true,
          timestamp: new Date(),
        },
      ];
      const mockContentItem = {
        id: 'content-1',
        moduleId: 'module-1',
        module: {
          id: 'module-1',
          courseId: 'course-1',
        },
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      const result = await service.syncOfflineProgress(userId, progressData);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('not enrolled');
    });

    it('should sync multiple items with mixed success and failure', async () => {
      const progressData = [
        {
          contentItemId: 'content-1',
          timeSpent: 100,
          completed: true,
          timestamp: new Date(),
        },
        {
          contentItemId: 'content-2',
          timeSpent: 50,
          completed: false,
          timestamp: new Date(),
        },
        {
          contentItemId: 'content-3',
          timeSpent: 75,
          completed: true,
          timestamp: new Date(),
        },
      ];
      const mockContentItem1 = {
        id: 'content-1',
        moduleId: 'module-1',
        module: { id: 'module-1', courseId: 'course-1' },
      };
      const mockContentItem3 = {
        id: 'content-3',
        moduleId: 'module-1',
        module: { id: 'module-1', courseId: 'course-1' },
      };
      const mockEnrollment = {
        id: 'enrollment-1',
        userId,
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
      };
      mockPrismaService.contentItem.findUnique
        .mockResolvedValueOnce(mockContentItem1)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockContentItem3);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.progress.upsert.mockResolvedValue({});
      mockPrismaService.module.findUnique.mockResolvedValue({
        id: 'module-1',
        contentItems: [{ id: 'content-1', mandatory: true }],
      });
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        modules: [{ id: 'module-1', contentItems: [{ id: 'content-1', mandatory: true }] }],
      });
      mockPrismaService.enrollment.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.syncOfflineProgress(userId, progressData);
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle empty progress data array', async () => {
      const result = await service.syncOfflineProgress(userId, []);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should sync incomplete progress without triggering completion checks', async () => {
      const progressData = [
        {
          contentItemId: 'content-1',
          timeSpent: 50,
          completed: false,
          timestamp: new Date(),
        },
      ];
      const mockContentItem = {
        id: 'content-1',
        moduleId: 'module-1',
        module: { id: 'module-1', courseId: 'course-1' },
      };
      const mockEnrollment = {
        id: 'enrollment-1',
        userId,
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.progress.upsert.mockResolvedValue({});
      const result = await service.syncOfflineProgress(userId, progressData);
      expect(result.synced).toBe(1);
      expect(mockPrismaService.module.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.course.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getProgressDashboard', () => {
    const userId = 'user-1';

    it('should return dashboard with estimated time remaining', async () => {
      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId,
          courseId: 'course-1',
          enrolledAt: new Date(),
          course: {
            id: 'course-1',
            title: 'Test Course',
            modules: [
              {
                id: 'module-1',
                contentItems: [
                  { id: 'content-1', mandatory: true },
                  { id: 'content-2', mandatory: true },
                ],
              },
            ],
          },
        },
      ];
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.course.findUnique.mockResolvedValue(mockEnrollments[0].course);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.progress.aggregate.mockResolvedValue({
        _sum: { timeSpent: 1800 },
      });
      const result = await service.getProgressDashboard(userId);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('estimatedTimeRemaining');
      expect(result[0].timeSpent).toBe(1800);
    });

    it('should return empty dashboard when no enrollments exist', async () => {
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);
      const result = await service.getProgressDashboard(userId);
      expect(result).toHaveLength(0);
    });

    it('should calculate 0 estimated time for 100% completion', async () => {
      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId,
          courseId: 'course-1',
          enrolledAt: new Date(),
          course: {
            id: 'course-1',
            title: 'Test Course',
            modules: [
              {
                id: 'module-1',
                contentItems: [{ id: 'content-1', mandatory: true }],
              },
            ],
          },
        },
      ];
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.course.findUnique.mockResolvedValue(mockEnrollments[0].course);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.progress.aggregate.mockResolvedValue({
        _sum: { timeSpent: 3600 },
      });
      const result = await service.getProgressDashboard(userId);
      expect(result[0].completionPercentage).toBe(100);
      expect(result[0].estimatedTimeRemaining).toBe(0);
    });
  });

  describe('completion percentage calculations', () => {
    const userId = 'user-1';

    it('should calculate 0% when no items completed', async () => {
      const moduleId = 'module-1';
      const mockModule = {
        id: moduleId,
        title: 'Test Module',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
        ],
      };
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(0);
      const result = await service.getModuleProgress(moduleId, userId);
      expect(result.completionPercentage).toBe(0);
      expect(result.completed).toBe(false);
    });

    it('should calculate 100% when all mandatory items completed', async () => {
      const moduleId = 'module-1';
      const mockModule = {
        id: moduleId,
        title: 'Test Module',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
        ],
      };
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(2);
      const result = await service.getModuleProgress(moduleId, userId);
      expect(result.completionPercentage).toBe(100);
      expect(result.completed).toBe(true);
    });

    it('should ignore non-mandatory items in percentage calculation', async () => {
      const moduleId = 'module-1';
      const mockModule = {
        id: moduleId,
        title: 'Test Module',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: false },
          { id: 'content-3', mandatory: true },
        ],
      };
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(1);
      const result = await service.getModuleProgress(moduleId, userId);
      expect(result.totalItems).toBe(2);
      expect(result.completedItems).toBe(1);
      expect(result.completionPercentage).toBe(50);
    });

    it('should handle course with no mandatory items across all modules', async () => {
      const courseId = 'course-1';
      const mockCourse = {
        id: courseId,
        title: 'Test Course',
        modules: [
          {
            id: 'module-1',
            contentItems: [{ id: 'content-1', mandatory: false }],
          },
          {
            id: 'module-2',
            contentItems: [{ id: 'content-2', mandatory: false }],
          },
        ],
      };
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      const result = await service.getCourseProgress(courseId, userId);
      expect(result.completionPercentage).toBe(100);
      expect(result.completed).toBe(true);
      expect(result.totalItems).toBe(0);
    });
  });

  describe('time tracking edge cases', () => {
    const userId = 'user-1';
    const contentItemId = 'content-1';

    it('should handle zero time spent', async () => {
      const mockContentItem = {
        id: contentItemId,
        moduleId: 'module-1',
        module: { id: 'module-1', courseId: 'course-1' },
      };
      const mockEnrollment = {
        id: 'enrollment-1',
        userId,
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.progress.upsert.mockResolvedValue({
        id: 'progress-1',
        userId,
        contentItemId,
        moduleId: 'module-1',
        timeSpent: 0,
        completed: false,
      });
      const result = await service.trackTimeSpent(contentItemId, userId, 0);
      expect(result.timeSpent).toBe(0);
    });

    it('should accumulate time spent across multiple tracking calls', async () => {
      const mockContentItem = {
        id: contentItemId,
        moduleId: 'module-1',
        module: { id: 'module-1', courseId: 'course-1' },
      };
      const mockEnrollment = {
        id: 'enrollment-1',
        userId,
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.progress.upsert.mockResolvedValue({
        id: 'progress-1',
        userId,
        contentItemId,
        moduleId: 'module-1',
        timeSpent: 150,
        completed: false,
      });
      const result = await service.trackTimeSpent(contentItemId, userId, 60);
      expect(mockPrismaService.progress.upsert).toHaveBeenCalledWith({
        where: {
          userId_contentItemId: { userId, contentItemId },
        },
        update: {
          timeSpent: { increment: 60 },
        },
        create: {
          userId,
          contentItemId,
          moduleId: 'module-1',
          timeSpent: 60,
          completed: false,
        },
      });
    });

    it('should handle large time values', async () => {
      const mockContentItem = {
        id: contentItemId,
        moduleId: 'module-1',
        module: { id: 'module-1', courseId: 'course-1' },
      };
      const mockEnrollment = {
        id: 'enrollment-1',
        userId,
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.progress.upsert.mockResolvedValue({
        id: 'progress-1',
        userId,
        contentItemId,
        moduleId: 'module-1',
        timeSpent: 86400,
        completed: false,
      });
      const result = await service.trackTimeSpent(contentItemId, userId, 86400);
      expect(result).toBeDefined();
    });
  });

  describe('estimated time remaining calculation', () => {
    const userId = 'user-1';

    it('should return 0 for 0% completion', async () => {
      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId,
          courseId: 'course-1',
          enrolledAt: new Date(),
          course: {
            id: 'course-1',
            title: 'Test Course',
            modules: [
              {
                id: 'module-1',
                contentItems: [{ id: 'content-1', mandatory: true }],
              },
            ],
          },
        },
      ];
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.course.findUnique.mockResolvedValue(mockEnrollments[0].course);
      mockPrismaService.progress.count.mockResolvedValue(0);
      mockPrismaService.progress.aggregate.mockResolvedValue({
        _sum: { timeSpent: 0 },
      });
      const result = await service.getProgressDashboard(userId);
      expect(result[0].estimatedTimeRemaining).toBe(0);
    });

    it('should calculate estimated time based on current pace', async () => {
      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId,
          courseId: 'course-1',
          enrolledAt: new Date(),
          course: {
            id: 'course-1',
            title: 'Test Course',
            modules: [
              {
                id: 'module-1',
                contentItems: [
                  { id: 'content-1', mandatory: true },
                  { id: 'content-2', mandatory: true },
                ],
              },
            ],
          },
        },
      ];
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.course.findUnique.mockResolvedValue(mockEnrollments[0].course);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.progress.aggregate.mockResolvedValue({
        _sum: { timeSpent: 1000 },
      });
      const result = await service.getProgressDashboard(userId);
      expect(result[0].estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });
});
