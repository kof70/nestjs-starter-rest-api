import { Test, TestingModule } from '@nestjs/testing';
import { ImportService } from './import.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Language, CourseStatus, ContentType, TabType } from '@prisma/client';

describe('ImportService', () => {
  let service: ImportService;
  let prisma: PrismaService;

  const mockPrismaService = {
    course: {
      create: jest.fn(),
    },
    module: {
      create: jest.fn(),
    },
    contentItem: {
      create: jest.fn(),
    },
    quiz: {
      create: jest.fn(),
    },
    question: {
      create: jest.fn(),
    },
    questionOption: {
      create: jest.fn(),
    },
    video: {
      create: jest.fn(),
    },
    tab: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importCourse', () => {
    const validExportData = {
      version: '1.0.0',
      exportedAt: '2024-01-01T00:00:00.000Z',
      course: {
        title: 'Test Course',
        description: 'Test Description',
        language: 'EN',
        status: 'PUBLISHED',
        enrollmentStart: null,
        enrollmentEnd: null,
        courseStart: null,
        courseEnd: null,
      },
      modules: [
        {
          title: 'Module 1',
          description: 'Module Description',
          order: 0,
          prerequisiteOrder: null,
          contentItems: [
            {
              title: 'Content 1',
              type: 'TEXT',
              order: 0,
              mandatory: true,
              textContent: 'Test content',
              videoUrl: null,
              videoEmbedCode: null,
              documentUrl: null,
              quiz: null,
              video: null,
            },
          ],
        },
      ],
      tabs: [
        {
          title: 'Course Info',
          type: 'COURSE_INFO',
          order: 0,
          visible: true,
          content: null,
          externalUrl: null,
        },
      ],
    };

    it('should reject invalid JSON', async () => {
      // Arrange
      const invalidJson = 'not valid json';
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(invalidJson, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_JSON');
    });

    it('should reject missing version', async () => {
      // Arrange
      const dataWithoutVersion = { ...validExportData };
      delete (dataWithoutVersion as any).version;
      const jsonData = JSON.stringify(dataWithoutVersion);
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_VERSION')).toBe(true);
    });

    it('should reject unsupported version', async () => {
      // Arrange
      const dataWithBadVersion = { ...validExportData, version: '2.0.0' };
      const jsonData = JSON.stringify(dataWithBadVersion);
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'UNSUPPORTED_VERSION')).toBe(
        true,
      );
    });

    it('should reject missing course metadata', async () => {
      // Arrange
      const dataWithoutCourse = { ...validExportData };
      delete (dataWithoutCourse as any).course;
      const jsonData = JSON.stringify(dataWithoutCourse);
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_COURSE')).toBe(true);
    });

    it('should reject invalid course title', async () => {
      // Arrange
      const dataWithInvalidTitle = {
        ...validExportData,
        course: { ...validExportData.course, title: '' },
      };
      const jsonData = JSON.stringify(dataWithInvalidTitle);
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'INVALID_COURSE_TITLE'),
      ).toBe(true);
    });

    it('should reject invalid language', async () => {
      // Arrange
      const dataWithInvalidLanguage = {
        ...validExportData,
        course: { ...validExportData.course, language: 'ES' },
      };
      const jsonData = JSON.stringify(dataWithInvalidLanguage);
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_LANGUAGE')).toBe(
        true,
      );
    });

    it('should reject invalid modules array', async () => {
      // Arrange
      const dataWithInvalidModules = {
        ...validExportData,
        modules: 'not an array',
      };
      const jsonData = JSON.stringify(dataWithInvalidModules);
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_MODULES')).toBe(
        true,
      );
    });

    it('should reject quiz with invalid passing score', async () => {
      // Arrange
      const dataWithInvalidQuiz = {
        ...validExportData,
        modules: [
          {
            ...validExportData.modules[0],
            contentItems: [
              {
                title: 'Quiz',
                type: 'QUIZ',
                order: 0,
                mandatory: true,
                textContent: null,
                videoUrl: null,
                videoEmbedCode: null,
                documentUrl: null,
                quiz: {
                  passingScore: 150, // Invalid
                  maxAttempts: 3,
                  questions: [
                    {
                      questionText: 'Question 1',
                      order: 0,
                      options: [
                        { optionText: 'A', isCorrect: true, order: 0 },
                        { optionText: 'B', isCorrect: false, order: 1 },
                      ],
                    },
                  ],
                },
                video: null,
              },
            ],
          },
        ],
      };
      const jsonData = JSON.stringify(dataWithInvalidQuiz);
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'INVALID_PASSING_SCORE'),
      ).toBe(true);
    });

    it('should reject quiz with no correct answer', async () => {
      // Arrange
      const dataWithNoCorrectAnswer = {
        ...validExportData,
        modules: [
          {
            ...validExportData.modules[0],
            contentItems: [
              {
                title: 'Quiz',
                type: 'QUIZ',
                order: 0,
                mandatory: true,
                textContent: null,
                videoUrl: null,
                videoEmbedCode: null,
                documentUrl: null,
                quiz: {
                  passingScore: 70,
                  maxAttempts: 3,
                  questions: [
                    {
                      questionText: 'Question 1',
                      order: 0,
                      options: [
                        { optionText: 'A', isCorrect: false, order: 0 },
                        { optionText: 'B', isCorrect: false, order: 1 },
                      ],
                    },
                  ],
                },
                video: null,
              },
            ],
          },
        ],
      };
      const jsonData = JSON.stringify(dataWithNoCorrectAnswer);
      const userId = 'user-123';

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'INVALID_CORRECT_COUNT'),
      ).toBe(true);
    });

    it('should successfully import valid course', async () => {
      // Arrange
      const jsonData = JSON.stringify(validExportData);
      const userId = 'user-123';
      const courseId = 'course-123';
      const moduleId = 'module-123';
      const contentItemId = 'content-123';

      mockPrismaService.course.create.mockResolvedValue({
        id: courseId,
        title: 'Test Course (Imported)',
        ownerId: userId,
      });
      mockPrismaService.module.create.mockResolvedValue({
        id: moduleId,
        courseId,
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: contentItemId,
        moduleId,
      });
      mockPrismaService.tab.create.mockResolvedValue({
        id: 'tab-123',
        courseId,
      });

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.courseId).toBe(courseId);
      expect(result.errors).toHaveLength(0);
      expect(mockPrismaService.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Course (Imported)',
            ownerId: userId,
            status: CourseStatus.DRAFT,
          }),
        }),
      );
    });

    it('should create course with unique identifiers', async () => {
      // Arrange
      const jsonData = JSON.stringify(validExportData);
      const userId = 'user-123';
      const courseId = 'new-course-id';

      mockPrismaService.course.create.mockResolvedValue({
        id: courseId,
        title: 'Test Course (Imported)',
        ownerId: userId,
      });
      mockPrismaService.module.create.mockResolvedValue({
        id: 'new-module-id',
        courseId,
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'new-content-id',
        moduleId: 'new-module-id',
      });
      mockPrismaService.tab.create.mockResolvedValue({
        id: 'new-tab-id',
        courseId,
      });

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.courseId).toBe(courseId);
      expect(mockPrismaService.course.create).toHaveBeenCalled();
      expect(mockPrismaService.module.create).toHaveBeenCalled();
      expect(mockPrismaService.contentItem.create).toHaveBeenCalled();
    });

    it('should import course with quiz', async () => {
      // Arrange
      const dataWithQuiz = {
        ...validExportData,
        modules: [
          {
            ...validExportData.modules[0],
            contentItems: [
              {
                title: 'Quiz',
                type: 'QUIZ',
                order: 0,
                mandatory: true,
                textContent: null,
                videoUrl: null,
                videoEmbedCode: null,
                documentUrl: null,
                quiz: {
                  passingScore: 70,
                  maxAttempts: 3,
                  questions: [
                    {
                      questionText: 'Question 1',
                      order: 0,
                      options: [
                        { optionText: 'A', isCorrect: true, order: 0 },
                        { optionText: 'B', isCorrect: false, order: 1 },
                      ],
                    },
                  ],
                },
                video: null,
              },
            ],
          },
        ],
      };
      const jsonData = JSON.stringify(dataWithQuiz);
      const userId = 'user-123';

      mockPrismaService.course.create.mockResolvedValue({
        id: 'course-123',
        ownerId: userId,
      });
      mockPrismaService.module.create.mockResolvedValue({
        id: 'module-123',
        courseId: 'course-123',
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-123',
        moduleId: 'module-123',
      });
      mockPrismaService.quiz.create.mockResolvedValue({
        id: 'quiz-123',
        contentItemId: 'content-123',
      });
      mockPrismaService.question.create.mockResolvedValue({
        id: 'question-123',
        quizId: 'quiz-123',
      });
      mockPrismaService.questionOption.create.mockResolvedValue({
        id: 'option-123',
        questionId: 'question-123',
      });
      mockPrismaService.tab.create.mockResolvedValue({
        id: 'tab-123',
        courseId: 'course-123',
      });

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrismaService.quiz.create).toHaveBeenCalled();
      expect(mockPrismaService.question.create).toHaveBeenCalled();
      expect(mockPrismaService.questionOption.create).toHaveBeenCalledTimes(2);
    });

    it('should warn about missing tabs', async () => {
      // Arrange
      const dataWithoutTabs = { ...validExportData };
      delete (dataWithoutTabs as any).tabs;
      const jsonData = JSON.stringify(dataWithoutTabs);
      const userId = 'user-123';

      mockPrismaService.course.create.mockResolvedValue({
        id: 'course-123',
        ownerId: userId,
      });
      mockPrismaService.module.create.mockResolvedValue({
        id: 'module-123',
        courseId: 'course-123',
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-123',
        moduleId: 'module-123',
      });

      // Act
      const result = await service.importCourse(jsonData, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => w.code === 'MISSING_TABS')).toBe(true);
    });
  });
});
