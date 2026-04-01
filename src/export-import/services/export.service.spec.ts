import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, CourseStatus, Language, ContentType, TabType } from '@prisma/client';
import { ExportFormat } from '../dtos/export-course.dto';

describe('ExportService', () => {
  let service: ExportService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    course: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportCourse', () => {
    const mockCourseId = 'course-123';
    const mockUserId = 'user-123';
    const mockInstructorRole = UserRole.INSTRUCTOR;

    const mockCourseData = {
      id: mockCourseId,
      title: 'Test Course',
      description: 'Test Description',
      language: Language.EN,
      status: CourseStatus.PUBLISHED,
      enrollmentStart: new Date('2024-01-01'),
      enrollmentEnd: new Date('2024-12-31'),
      courseStart: new Date('2024-01-15'),
      courseEnd: new Date('2024-12-15'),
      ownerId: mockUserId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [
        {
          id: 'module-1',
          title: 'Module 1',
          description: 'Module Description',
          order: 1,
          prerequisite: null,
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
              quiz: null,
              video: null,
            },
          ],
        },
      ],
      tabs: [
        {
          id: 'tab-1',
          title: 'Course Info',
          type: TabType.COURSE_INFO,
          order: 1,
          visible: true,
          content: null,
          externalUrl: null,
        },
      ],
    };

    it('should export course to JSON format successfully', async () => {
      // Arrange
      mockPrismaService.course.findUnique
        .mockResolvedValueOnce(mockCourseData)
        .mockResolvedValueOnce(mockCourseData);

      // Act
      const result = await service.exportCourse(
        mockCourseId,
        mockUserId,
        mockInstructorRole,
        ExportFormat.JSON,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.filename).toContain('course-');
      expect(result.filename).toContain('.json');
      expect(result.mimeType).toBe('application/json');
      expect(result.data).toBeInstanceOf(Buffer);

      const exportedData = JSON.parse(result.data.toString('utf-8'));
      expect(exportedData.version).toBe('1.0.0');
      expect(exportedData.course.title).toBe('Test Course');
      expect(exportedData.modules).toHaveLength(1);
      expect(exportedData.tabs).toHaveLength(1);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      // Arrange
      mockPrismaService.course.findUnique.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.exportCourse(
          mockCourseId,
          mockUserId,
          mockInstructorRole,
          ExportFormat.JSON,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when instructor tries to export another instructor course', async () => {
      // Arrange
      const otherInstructorCourse = {
        ...mockCourseData,
        ownerId: 'other-instructor-id',
      };
      mockPrismaService.course.findUnique.mockResolvedValueOnce(
        otherInstructorCourse,
      );

      // Act & Assert
      await expect(
        service.exportCourse(
          mockCourseId,
          mockUserId,
          mockInstructorRole,
          ExportFormat.JSON,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to export any course', async () => {
      // Arrange
      const otherInstructorCourse = {
        ...mockCourseData,
        ownerId: 'other-instructor-id',
      };
      mockPrismaService.course.findUnique
        .mockResolvedValueOnce(otherInstructorCourse)
        .mockResolvedValueOnce(otherInstructorCourse);

      // Act
      const result = await service.exportCourse(
        mockCourseId,
        mockUserId,
        UserRole.ADMIN,
        ExportFormat.JSON,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.mimeType).toBe('application/json');
    });

    it('should throw BadRequestException for ZIP format', async () => {
      // Arrange
      mockPrismaService.course.findUnique
        .mockResolvedValueOnce(mockCourseData)
        .mockResolvedValueOnce(mockCourseData);

      // Act & Assert
      await expect(
        service.exportCourse(
          mockCourseId,
          mockUserId,
          mockInstructorRole,
          ExportFormat.ZIP,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should exclude learner data from export', async () => {
      // Arrange
      mockPrismaService.course.findUnique
        .mockResolvedValueOnce(mockCourseData)
        .mockResolvedValueOnce(mockCourseData);

      // Act
      const result = await service.exportCourse(
        mockCourseId,
        mockUserId,
        mockInstructorRole,
        ExportFormat.JSON,
      );

      // Assert
      const exportedData = JSON.parse(result.data.toString('utf-8'));
      expect(exportedData.enrollments).toBeUndefined();
      expect(exportedData.progress).toBeUndefined();
      expect(exportedData.quizAttempts).toBeUndefined();
      expect(exportedData.grades).toBeUndefined();
      expect(exportedData.certificates).toBeUndefined();
    });

    it('should include quiz data in export', async () => {
      // Arrange
      const courseWithQuiz = {
        ...mockCourseData,
        modules: [
          {
            ...mockCourseData.modules[0],
            contentItems: [
              {
                id: 'content-quiz',
                title: 'Quiz Content',
                type: ContentType.QUIZ,
                order: 1,
                mandatory: true,
                textContent: null,
                videoUrl: null,
                videoEmbedCode: null,
                documentUrl: null,
                video: null,
                quiz: {
                  id: 'quiz-1',
                  passingScore: 70,
                  maxAttempts: 3,
                  questions: [
                    {
                      id: 'question-1',
                      questionText: 'What is 2+2?',
                      order: 1,
                      options: [
                        {
                          id: 'option-1',
                          optionText: '3',
                          isCorrect: false,
                          order: 1,
                        },
                        {
                          id: 'option-2',
                          optionText: '4',
                          isCorrect: true,
                          order: 2,
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
      mockPrismaService.course.findUnique
        .mockResolvedValueOnce(courseWithQuiz)
        .mockResolvedValueOnce(courseWithQuiz);

      // Act
      const result = await service.exportCourse(
        mockCourseId,
        mockUserId,
        mockInstructorRole,
        ExportFormat.JSON,
      );

      // Assert
      const exportedData = JSON.parse(result.data.toString('utf-8'));
      expect(exportedData.modules[0].contentItems[0].quiz).toBeDefined();
      expect(exportedData.modules[0].contentItems[0].quiz.passingScore).toBe(70);
      expect(exportedData.modules[0].contentItems[0].quiz.questions).toHaveLength(1);
    });

    it('should include video metadata in export', async () => {
      // Arrange
      const courseWithVideo = {
        ...mockCourseData,
        modules: [
          {
            ...mockCourseData.modules[0],
            contentItems: [
              {
                id: 'content-video',
                title: 'Video Content',
                type: ContentType.VIDEO,
                order: 1,
                mandatory: true,
                textContent: null,
                videoUrl: 'https://example.com/video.mp4',
                videoEmbedCode: null,
                documentUrl: null,
                quiz: null,
                video: {
                  id: 'video-1',
                  title: 'Test Video',
                  description: 'Video Description',
                  duration: 300,
                  format: 'mp4',
                  thumbnailUrl: 'https://example.com/thumb.jpg',
                  youtubeUrl: null,
                },
              },
            ],
          },
        ],
      };
      mockPrismaService.course.findUnique
        .mockResolvedValueOnce(courseWithVideo)
        .mockResolvedValueOnce(courseWithVideo);

      // Act
      const result = await service.exportCourse(
        mockCourseId,
        mockUserId,
        mockInstructorRole,
        ExportFormat.JSON,
      );

      // Assert
      const exportedData = JSON.parse(result.data.toString('utf-8'));
      expect(exportedData.modules[0].contentItems[0].video).toBeDefined();
      expect(exportedData.modules[0].contentItems[0].video.title).toBe('Test Video');
      expect(exportedData.modules[0].contentItems[0].video.duration).toBe(300);
    });

    it('should include course metadata in export', async () => {
      // Arrange
      mockPrismaService.course.findUnique
        .mockResolvedValueOnce(mockCourseData)
        .mockResolvedValueOnce(mockCourseData);

      // Act
      const result = await service.exportCourse(
        mockCourseId,
        mockUserId,
        mockInstructorRole,
        ExportFormat.JSON,
      );

      // Assert
      const exportedData = JSON.parse(result.data.toString('utf-8'));
      expect(exportedData.course.title).toBe('Test Course');
      expect(exportedData.course.description).toBe('Test Description');
      expect(exportedData.course.language).toBe(Language.EN);
      expect(exportedData.course.status).toBe(CourseStatus.PUBLISHED);
      expect(exportedData.course.enrollmentStart).toBeDefined();
      expect(exportedData.course.enrollmentEnd).toBeDefined();
    });
  });
});
