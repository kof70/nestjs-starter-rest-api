import { Test, TestingModule } from '@nestjs/testing';
import { LmsNavigationService } from './lms-navigation.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EnrollmentStatus, Language, ContentType } from '@prisma/client';

describe('LmsNavigationService', () => {
  let service: LmsNavigationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    enrollment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    module: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    progress: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LmsNavigationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LmsNavigationService>(LmsNavigationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockPrismaService.progress.count.mockReset();
    mockPrismaService.module.findUnique.mockReset();
  });

  describe('getEnrolledCourses', () => {
    it('should return enrolled courses with progress', async () => {
      const mockUserId = 'user-1';
      const mockEnrollments = [
        {
          courseId: 'course-1',
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date('2024-01-01'),
          course: {
            id: 'course-1',
            title: 'Test Course',
            description: 'Test Description',
            language: Language.EN,
            courseStart: new Date('2024-01-01'),
            courseEnd: new Date('2024-12-31'),
          },
        },
      ];

      const mockCourse = {
        id: 'course-1',
        modules: [
          {
            id: 'module-1',
            contentItems: [
              { id: 'content-1', mandatory: true },
              { id: 'content-2', mandatory: true },
            ],
          },
        ],
      };

      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);

      const result = await service.getEnrolledCourses(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('course-1');
      expect(result[0].title).toBe('Test Course');
      expect(result[0].enrollmentStatus).toBe(EnrollmentStatus.ACTIVE);
      expect(result[0].progressPercentage).toBe(50);
      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: {
            in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
          },
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
              language: true,
              courseStart: true,
              courseEnd: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });
    });

    it('should return empty array when no enrollments exist', async () => {
      const mockUserId = 'user-1';
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);

      const result = await service.getEnrolledCourses(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getCourseModules', () => {
    it('should return modules with progress and locking status', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          description: 'First module',
          order: 1,
          prerequisiteId: null,
        },
        {
          id: 'module-2',
          title: 'Module 2',
          description: 'Second module',
          order: 2,
          prerequisiteId: 'module-1',
        },
      ];

      const mockModule1 = {
        id: 'module-1',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
        ],
      };

      const mockModule2 = {
        id: 'module-2',
        contentItems: [{ id: 'content-3', mandatory: true }],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      // module-1 progress, module-2 progress, module-1 for module-2 prerequisite check
      mockPrismaService.module.findUnique
        .mockResolvedValueOnce(mockModule1)
        .mockResolvedValueOnce(mockModule2)
        .mockResolvedValueOnce(mockModule1);
      mockPrismaService.progress.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('module-1');
      expect(result[0].locked).toBe(false);
      expect(result[0].progressPercentage).toBe(100);
      expect(result[1].id).toBe('module-2');
      expect(result[1].locked).toBe(false);
      expect(result[1].progressPercentage).toBe(0);
    });

    it('should lock module when prerequisite is not completed', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          description: 'First module',
          order: 1,
          prerequisiteId: null,
        },
        {
          id: 'module-2',
          title: 'Module 2',
          description: 'Second module',
          order: 2,
          prerequisiteId: 'module-1',
        },
      ];

      const mockModule1 = {
        id: 'module-1',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
        ],
      };

      const mockModule2 = {
        id: 'module-2',
        contentItems: [{ id: 'content-3', mandatory: true }],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      mockPrismaService.module.findUnique
        .mockResolvedValueOnce(mockModule1)
        .mockResolvedValueOnce(mockModule2)
        .mockResolvedValueOnce(mockModule1);
      mockPrismaService.progress.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result[0].locked).toBe(false);
      expect(result[0].progressPercentage).toBe(50);
      expect(result[1].locked).toBe(true);
    });

    it('should throw BadRequestException when user is not enrolled', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.getCourseModules(mockCourseId, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getCourseModules(mockCourseId, mockUserId),
      ).rejects.toThrow('User is not enrolled in this course');
    });
  });

  describe('getModuleContent', () => {
    it('should return content items with progress tracking (Requirement 5.4, 6.1)', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';
      const mockModuleId = 'module-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModule = {
        id: mockModuleId,
        courseId: mockCourseId,
        contentItems: [
          {
            id: 'content-1',
            title: 'Content 1',
            type: ContentType.TEXT,
            order: 1,
            mandatory: true,
            textContent: 'Test content',
            videoUrl: null,
            videoEmbedCode: null,
            documentUrl: null,
          },
          {
            id: 'content-2',
            title: 'Content 2',
            type: ContentType.VIDEO,
            order: 2,
            mandatory: false,
            textContent: null,
            videoUrl: 'https://example.com/video.mp4',
            videoEmbedCode: null,
            documentUrl: null,
          },
        ],
      };

      const mockProgress1 = {
        userId: mockUserId,
        contentItemId: 'content-1',
        completed: true,
        timeSpent: 300,
        completedAt: new Date('2024-01-15'),
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.findUnique
        .mockResolvedValueOnce(mockProgress1)
        .mockResolvedValueOnce(null);

      const result = await service.getModuleContent(
        mockCourseId,
        mockModuleId,
        mockUserId,
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('content-1');
      expect(result[0].completed).toBe(true);
      expect(result[0].timeSpent).toBe(300);
      expect(result[1].id).toBe('content-2');
      expect(result[1].completed).toBe(false);
      expect(result[1].timeSpent).toBe(0);
    });

    it('should throw NotFoundException when module does not exist', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';
      const mockModuleId = 'module-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(
        service.getModuleContent(mockCourseId, mockModuleId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getModuleContent(mockCourseId, mockModuleId, mockUserId),
      ).rejects.toThrow('Module not found');
    });

    it('should throw BadRequestException when module does not belong to course', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';
      const mockModuleId = 'module-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModule = {
        id: mockModuleId,
        courseId: 'different-course',
        contentItems: [],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      await expect(
        service.getModuleContent(mockCourseId, mockModuleId, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getModuleContent(mockCourseId, mockModuleId, mockUserId),
      ).rejects.toThrow('Module does not belong to this course');
    });

    it('should throw BadRequestException when user is not enrolled', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';
      const mockModuleId = 'module-1';

      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.getModuleContent(mockCourseId, mockModuleId, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getModuleContent(mockCourseId, mockModuleId, mockUserId),
      ).rejects.toThrow('User is not enrolled in this course');
    });
  });

  describe('progress calculation edge cases (Requirement 5.5, 6.2, 6.3)', () => {
    it('should calculate 0% progress when no content is completed', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          order: 1,
          prerequisiteId: null,
        },
      ];

      const mockModule = {
        id: 'module-1',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
        ],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(0);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result[0].progressPercentage).toBe(0);
      expect(result[0].completed).toBe(false);
      expect(result[0].completedItems).toBe(0);
      expect(result[0].totalItems).toBe(2);
    });

    it('should calculate 100% progress when all mandatory content is completed', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          order: 1,
          prerequisiteId: null,
        },
      ];

      const mockModule = {
        id: 'module-1',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
          { id: 'content-3', mandatory: false },
        ],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(2);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result[0].progressPercentage).toBe(100);
      expect(result[0].completed).toBe(true);
      expect(result[0].completedItems).toBe(2);
      expect(result[0].totalItems).toBe(2);
    });

    it('should calculate 50% progress when half of mandatory content is completed', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          order: 1,
          prerequisiteId: null,
        },
      ];

      const mockModule = {
        id: 'module-1',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
          { id: 'content-3', mandatory: true },
          { id: 'content-4', mandatory: true },
        ],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(2);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result[0].progressPercentage).toBe(50);
      expect(result[0].completed).toBe(false);
      expect(result[0].completedItems).toBe(2);
      expect(result[0].totalItems).toBe(4);
    });

    it('should return 100% progress for module with no mandatory items', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          order: 1,
          prerequisiteId: null,
        },
      ];

      const mockModule = {
        id: 'module-1',
        contentItems: [
          { id: 'content-1', mandatory: false },
          { id: 'content-2', mandatory: false },
        ],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(0);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result[0].progressPercentage).toBe(100);
      expect(result[0].completed).toBe(true);
      expect(result[0].completedItems).toBe(0);
      expect(result[0].totalItems).toBe(0);
    });

    it('should ignore optional content items in progress calculation', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          order: 1,
          prerequisiteId: null,
        },
      ];

      const mockModule = {
        id: 'module-1',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: false },
          { id: 'content-3', mandatory: false },
        ],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.progress.count.mockResolvedValue(1);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result[0].progressPercentage).toBe(100);
      expect(result[0].completed).toBe(true);
      expect(result[0].totalItems).toBe(1);
    });
  });

  describe('prerequisite chain locking (Requirement 5.7)', () => {
    it('should lock module chain when first prerequisite is incomplete', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          order: 1,
          prerequisiteId: null,
        },
        {
          id: 'module-2',
          title: 'Module 2',
          order: 2,
          prerequisiteId: 'module-1',
        },
        {
          id: 'module-3',
          title: 'Module 3',
          order: 3,
          prerequisiteId: 'module-2',
        },
      ];

      const mockModule1 = {
        id: 'module-1',
        contentItems: [
          { id: 'content-1', mandatory: true },
          { id: 'content-2', mandatory: true },
        ],
      };

      const mockModule2 = {
        id: 'module-2',
        contentItems: [{ id: 'content-3', mandatory: true }],
      };

      const mockModule3 = {
        id: 'module-3',
        contentItems: [{ id: 'content-4', mandatory: true }],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      // m1 prog, m2 prog, m1 prereq, m3 prog, m2 prereq
      mockPrismaService.module.findUnique
        .mockResolvedValueOnce(mockModule1)
        .mockResolvedValueOnce(mockModule2)
        .mockResolvedValueOnce(mockModule1)
        .mockResolvedValueOnce(mockModule3)
        .mockResolvedValueOnce(mockModule2);
      mockPrismaService.progress.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result[0].locked).toBe(false);
      expect(result[0].progressPercentage).toBe(50);
      expect(result[1].locked).toBe(true);
      expect(result[2].locked).toBe(true);
    });

    it('should unlock module chain when all prerequisites are completed', async () => {
      const mockUserId = 'user-1';
      const mockCourseId = 'course-1';

      const mockEnrollment = {
        id: 'enrollment-1',
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          order: 1,
          prerequisiteId: null,
        },
        {
          id: 'module-2',
          title: 'Module 2',
          order: 2,
          prerequisiteId: 'module-1',
        },
        {
          id: 'module-3',
          title: 'Module 3',
          order: 3,
          prerequisiteId: 'module-2',
        },
      ];

      const mockModule1 = {
        id: 'module-1',
        contentItems: [{ id: 'content-1', mandatory: true }],
      };

      const mockModule2 = {
        id: 'module-2',
        contentItems: [{ id: 'content-2', mandatory: true }],
      };

      const mockModule3 = {
        id: 'module-3',
        contentItems: [{ id: 'content-3', mandatory: true }],
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      mockPrismaService.module.findUnique
        .mockResolvedValueOnce(mockModule1)
        .mockResolvedValueOnce(mockModule2)
        .mockResolvedValueOnce(mockModule1)
        .mockResolvedValueOnce(mockModule3)
        .mockResolvedValueOnce(mockModule2);
      mockPrismaService.progress.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      const result = await service.getCourseModules(mockCourseId, mockUserId);

      expect(result[0].locked).toBe(false);
      expect(result[0].completed).toBe(true);
      expect(result[1].locked).toBe(false);
      expect(result[1].completed).toBe(true);
      expect(result[2].locked).toBe(false);
      expect(result[2].completed).toBe(false);
    });
  });

  describe('enrolled courses with progress (Requirement 5.2, 5.5, 6.4)', () => {
    it('should display progress percentage for enrolled courses', async () => {
      const mockUserId = 'user-1';
      const mockEnrollments = [
        {
          courseId: 'course-1',
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date('2024-01-01'),
          course: {
            id: 'course-1',
            title: 'Test Course',
            description: 'Test Description',
            language: Language.EN,
            courseStart: new Date('2024-01-01'),
            courseEnd: new Date('2024-12-31'),
          },
        },
      ];

      const mockCourse = {
        id: 'course-1',
        modules: [
          {
            id: 'module-1',
            contentItems: [
              { id: 'content-1', mandatory: true },
              { id: 'content-2', mandatory: true },
              { id: 'content-3', mandatory: true },
            ],
          },
        ],
      };

      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(2);

      const result = await service.getEnrolledCourses(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].progressPercentage).toBeCloseTo(66.67, 1);
      expect(result[0].completed).toBe(false);
    });

    it('should mark course as completed when progress is 100%', async () => {
      const mockUserId = 'user-1';
      const mockEnrollments = [
        {
          courseId: 'course-1',
          status: EnrollmentStatus.COMPLETED,
          enrolledAt: new Date('2024-01-01'),
          course: {
            id: 'course-1',
            title: 'Test Course',
            description: 'Test Description',
            language: Language.EN,
            courseStart: new Date('2024-01-01'),
            courseEnd: new Date('2024-12-31'),
          },
        },
      ];

      const mockCourse = {
        id: 'course-1',
        modules: [
          {
            id: 'module-1',
            contentItems: [
              { id: 'content-1', mandatory: true },
              { id: 'content-2', mandatory: true },
            ],
          },
        ],
      };

      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(2);

      const result = await service.getEnrolledCourses(mockUserId);

      expect(result[0].progressPercentage).toBe(100);
      expect(result[0].completed).toBe(true);
      expect(result[0].enrollmentStatus).toBe(EnrollmentStatus.COMPLETED);
    });

    it('should handle courses with multiple modules in progress calculation', async () => {
      const mockUserId = 'user-1';
      const mockEnrollments = [
        {
          courseId: 'course-1',
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date('2024-01-01'),
          course: {
            id: 'course-1',
            title: 'Test Course',
            description: 'Test Description',
            language: Language.EN,
            courseStart: new Date('2024-01-01'),
            courseEnd: new Date('2024-12-31'),
          },
        },
      ];

      const mockCourse = {
        id: 'course-1',
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
              { id: 'content-4', mandatory: true },
            ],
          },
        ],
      };

      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      const result = await service.getEnrolledCourses(mockUserId);

      expect(result[0].progressPercentage).toBe(75);
      expect(result[0].completed).toBe(false);
    });
  });
});
