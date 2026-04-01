import { Test, TestingModule } from '@nestjs/testing';
import { GradingService } from './grading.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContentType } from '@prisma/client';

describe('GradingService', () => {
  let service: GradingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    contentItem: {
      findUnique: jest.fn(),
    },
    quizAttempt: {
      findMany: jest.fn(),
    },
    module: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    grade: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockContentItem = {
    id: 'content-1',
    title: 'Quiz 1',
    type: ContentType.QUIZ,
    moduleId: 'module-1',
    quiz: {
      id: 'quiz-1',
      passingScore: 70,
    },
  };

  const mockModule = {
    id: 'module-1',
    title: 'Module 1',
    courseId: 'course-1',
    contentItems: [
      {
        id: 'content-1',
        title: 'Quiz 1',
        type: ContentType.QUIZ,
      },
      {
        id: 'content-2',
        title: 'Quiz 2',
        type: ContentType.QUIZ,
      },
    ],
  };

  const mockCourse = {
    id: 'course-1',
    title: 'Test Course',
    modules: [
      {
        id: 'module-1',
        title: 'Module 1',
        order: 1,
        contentItems: [
          {
            id: 'content-1',
            title: 'Quiz 1',
            type: ContentType.QUIZ,
          },
        ],
      },
      {
        id: 'module-2',
        title: 'Module 2',
        order: 2,
        contentItems: [
          {
            id: 'content-2',
            title: 'Quiz 2',
            type: ContentType.QUIZ,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GradingService>(GradingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateItemGrade', () => {
    it('should calculate item grade using best score from attempts', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        { score: 85, userId: 'user-1', quizId: 'quiz-1' },
      ]);

      const actualScore = await service.calculateItemGrade('user-1', 'content-1');

      expect(actualScore).toBe(85);
      expect(mockPrismaService.quizAttempt.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', quizId: 'quiz-1' },
        orderBy: { score: 'desc' },
        take: 1,
      });
    });

    it('should return 0 when no quiz attempts exist', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([]);

      const actualScore = await service.calculateItemGrade('user-1', 'content-1');

      expect(actualScore).toBe(0);
    });

    it('should throw NotFoundException when content item not found', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateItemGrade('user-1', 'content-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when content item is not a quiz', async () => {
      const mockNonQuizContent = {
        ...mockContentItem,
        type: ContentType.VIDEO,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockNonQuizContent);

      await expect(
        service.calculateItemGrade('user-1', 'content-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quiz not found for content item', async () => {
      const mockContentWithoutQuiz = {
        ...mockContentItem,
        quiz: null,
      };
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentWithoutQuiz);

      await expect(
        service.calculateItemGrade('user-1', 'content-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should select best score from multiple attempts', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        { score: 95, userId: 'user-1', quizId: 'quiz-1' },
      ]);

      const actualScore = await service.calculateItemGrade('user-1', 'content-1');

      expect(actualScore).toBe(95);
    });
  });

  describe('calculateModuleGrade', () => {
    it('should calculate module grade as weighted average', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.grade.findMany.mockResolvedValue([
        {
          id: 'grade-1',
          userId: 'user-1',
          contentItemId: 'content-1',
          moduleId: 'module-1',
          grade: 80,
          weight: 1.0,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'grade-2',
          userId: 'user-1',
          contentItemId: 'content-2',
          moduleId: 'module-1',
          grade: 90,
          weight: 1.0,
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const actualGrade = await service.calculateModuleGrade('user-1', 'module-1');

      expect(actualGrade).toBe(85);
    });

    it('should handle weighted grading correctly', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.grade.findMany.mockResolvedValue([
        {
          id: 'grade-1',
          userId: 'user-1',
          contentItemId: 'content-1',
          moduleId: 'module-1',
          grade: 80,
          weight: 2.0,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'grade-2',
          userId: 'user-1',
          contentItemId: 'content-2',
          moduleId: 'module-1',
          grade: 90,
          weight: 1.0,
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const actualGrade = await service.calculateModuleGrade('user-1', 'module-1');

      expect(actualGrade).toBeCloseTo(83.33, 2);
    });

    it('should return 0 when module has no content items', async () => {
      const mockEmptyModule = {
        ...mockModule,
        contentItems: [],
      };
      mockPrismaService.module.findUnique.mockResolvedValue(mockEmptyModule);

      const actualGrade = await service.calculateModuleGrade('user-1', 'module-1');

      expect(actualGrade).toBe(0);
    });

    it('should return 0 when no grades exist for module', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const actualGrade = await service.calculateModuleGrade('user-1', 'module-1');

      expect(actualGrade).toBe(0);
    });

    it('should throw NotFoundException when module not found', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateModuleGrade('user-1', 'module-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use latest grade when multiple grades exist for same item', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.grade.findMany.mockResolvedValue([
        {
          id: 'grade-1',
          userId: 'user-1',
          contentItemId: 'content-1',
          moduleId: 'module-1',
          grade: 90,
          weight: 1.0,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'grade-2',
          userId: 'user-1',
          contentItemId: 'content-1',
          moduleId: 'module-1',
          grade: 70,
          weight: 1.0,
          createdAt: new Date('2024-01-01'),
        },
      ]);

      const actualGrade = await service.calculateModuleGrade('user-1', 'module-1');

      expect(actualGrade).toBe(90);
    });

    it('should handle partial completion correctly', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.grade.findMany.mockResolvedValue([
        {
          id: 'grade-1',
          userId: 'user-1',
          contentItemId: 'content-1',
          moduleId: 'module-1',
          grade: 80,
          weight: 1.0,
          createdAt: new Date('2024-01-01'),
        },
      ]);

      const actualGrade = await service.calculateModuleGrade('user-1', 'module-1');

      expect(actualGrade).toBe(80);
    });

    it('should return 0 when total weight is zero', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.grade.findMany.mockResolvedValue([
        {
          id: 'grade-1',
          userId: 'user-1',
          contentItemId: 'content-1',
          moduleId: 'module-1',
          grade: 80,
          weight: 0,
          createdAt: new Date('2024-01-01'),
        },
      ]);

      const actualGrade = await service.calculateModuleGrade('user-1', 'module-1');

      expect(actualGrade).toBe(0);
    });
  });

  describe('calculateCourseGrade', () => {
    it('should calculate course grade as average of module grades', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.findUnique
        .mockResolvedValueOnce({
          ...mockModule,
          id: 'module-1',
          contentItems: [mockModule.contentItems[0]],
        })
        .mockResolvedValueOnce({
          ...mockModule,
          id: 'module-2',
          contentItems: [mockModule.contentItems[1]],
        });
      mockPrismaService.grade.findMany
        .mockResolvedValueOnce([
          {
            id: 'grade-1',
            userId: 'user-1',
            contentItemId: 'content-1',
            moduleId: 'module-1',
            grade: 80,
            weight: 1.0,
            createdAt: new Date('2024-01-01'),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'grade-2',
            userId: 'user-1',
            contentItemId: 'content-2',
            moduleId: 'module-2',
            grade: 90,
            weight: 1.0,
            createdAt: new Date('2024-01-02'),
          },
        ]);

      const actualGrade = await service.calculateCourseGrade('user-1', 'course-1');

      expect(actualGrade).toBe(85);
    });

    it('should return 0 when course has no modules', async () => {
      const mockEmptyCourse = {
        ...mockCourse,
        modules: [],
      };
      mockPrismaService.course.findUnique.mockResolvedValue(mockEmptyCourse);

      const actualGrade = await service.calculateCourseGrade('user-1', 'course-1');

      expect(actualGrade).toBe(0);
    });

    it('should return 0 when no modules have grades', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.findUnique
        .mockResolvedValueOnce({
          ...mockModule,
          id: 'module-1',
          contentItems: [mockModule.contentItems[0]],
        })
        .mockResolvedValueOnce({
          ...mockModule,
          id: 'module-2',
          contentItems: [mockModule.contentItems[1]],
        });
      mockPrismaService.grade.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const actualGrade = await service.calculateCourseGrade('user-1', 'course-1');

      expect(actualGrade).toBe(0);
    });

    it('should throw NotFoundException when course not found', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateCourseGrade('user-1', 'course-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle partial grading correctly', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.findUnique
        .mockResolvedValueOnce({
          ...mockModule,
          id: 'module-1',
          contentItems: [mockModule.contentItems[0]],
        })
        .mockResolvedValueOnce({
          ...mockModule,
          id: 'module-2',
          contentItems: [mockModule.contentItems[1]],
        });
      mockPrismaService.grade.findMany
        .mockResolvedValueOnce([
          {
            id: 'grade-1',
            userId: 'user-1',
            contentItemId: 'content-1',
            moduleId: 'module-1',
            grade: 80,
            weight: 1.0,
            createdAt: new Date('2024-01-01'),
          },
        ])
        .mockResolvedValueOnce([]);

      const actualGrade = await service.calculateCourseGrade('user-1', 'course-1');

      expect(actualGrade).toBe(80);
    });
  });
});
