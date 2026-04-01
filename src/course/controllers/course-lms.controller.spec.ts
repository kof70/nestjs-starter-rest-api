import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CourseLmsController } from './course-lms.controller';
import { CourseService } from '../services/course.service';
import { UserRole, Language, CourseStatus, ContentType } from '@prisma/client';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('CourseLmsController', () => {
  let controller: CourseLmsController;
  let courseService: jest.Mocked<CourseService>;

  const mockLearnerId = 'learner-123';
  const mockCourseId = 'course-123';

  const mockPublishedCourse = {
    id: mockCourseId,
    title: 'Published Course',
    description: 'Published Description',
    language: Language.EN,
    status: CourseStatus.PUBLISHED,
    enrollmentStart: null,
    enrollmentEnd: null,
    courseStart: null,
    courseEnd: null,
    version: 1,
    ownerId: 'instructor-123',
    owner: {
      id: 'instructor-123',
      email: 'instructor@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDraftCourse = {
    ...mockPublishedCourse,
    status: CourseStatus.DRAFT,
  };

  const mockRequestContext: RequestContext = {
    requestID: 'req-123',
    url: '/lms/courses',
    ip: '127.0.0.1',
    user: {
      id: mockLearnerId as any,
      username: 'learner',
      roles: [UserRole.LEARNER] as any,
      language: Language.EN,
    },
  } as RequestContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseLmsController],
      providers: [
        {
          provide: CourseService,
          useValue: {
            findAllForLms: jest.fn(),
            findByIdForLms: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockResolvedValue('Course not found or not available'),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CourseLmsController>(CourseLmsController);
    courseService = module.get(CourseService) as jest.Mocked<CourseService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findPublishedCourses', () => {
    it('should return paginated published courses with default pagination', async () => {
      const mockPaginatedResult = {
        data: [mockPublishedCourse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      courseService.findAllForLms.mockResolvedValue(mockPaginatedResult);

      const actualResult = await controller.findPublishedCourses(
        {},
        mockRequestContext,
      );

      expect(actualResult).toEqual(mockPaginatedResult);
      expect(courseService.findAllForLms).toHaveBeenCalledWith(
        {
          status: CourseStatus.PUBLISHED,
        },
        Language.EN,
      );
    });

    it('should force PUBLISHED status even if other status is provided', async () => {
      const inputQuery = { status: CourseStatus.DRAFT };
      const mockPaginatedResult = {
        data: [mockPublishedCourse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      courseService.findAllForLms.mockResolvedValue(mockPaginatedResult);

      await controller.findPublishedCourses(inputQuery, mockRequestContext);

      expect(courseService.findAllForLms).toHaveBeenCalledWith(
        {
          status: CourseStatus.PUBLISHED,
        },
        Language.EN,
      );
    });

    it('should filter courses by language', async () => {
      const inputQuery = { language: Language.FR };
      const mockFrenchCourse = {
        ...mockPublishedCourse,
        language: Language.FR,
        title: 'Cours en Français',
      };
      const mockPaginatedResult = {
        data: [mockFrenchCourse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      courseService.findAllForLms.mockResolvedValue(mockPaginatedResult);

      const actualResult = await controller.findPublishedCourses(
        inputQuery,
        mockRequestContext,
      );

      expect(actualResult.data[0].language).toBe(Language.FR);
      expect(courseService.findAllForLms).toHaveBeenCalledWith(
        {
          language: Language.FR,
          status: CourseStatus.PUBLISHED,
        },
        Language.EN,
      );
    });

    it('should search courses by title (case-insensitive)', async () => {
      const inputQuery = { search: 'nestjs' };
      const mockPaginatedResult = {
        data: [mockPublishedCourse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      courseService.findAllForLms.mockResolvedValue(mockPaginatedResult);

      await controller.findPublishedCourses(inputQuery, mockRequestContext);

      expect(courseService.findAllForLms).toHaveBeenCalledWith(
        {
          search: 'nestjs',
          status: CourseStatus.PUBLISHED,
        },
        Language.EN,
      );
    });

    it('should search courses by description (case-insensitive)', async () => {
      const inputQuery = { search: 'framework' };
      const mockPaginatedResult = {
        data: [mockPublishedCourse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      courseService.findAllForLms.mockResolvedValue(mockPaginatedResult);

      await controller.findPublishedCourses(inputQuery, mockRequestContext);

      expect(courseService.findAllForLms).toHaveBeenCalledWith(
        {
          search: 'framework',
          status: CourseStatus.PUBLISHED,
        },
        Language.EN,
      );
    });

    it('should support custom pagination with page 2 and limit 10', async () => {
      const inputQuery = { page: 2, limit: 10 };
      const mockPaginatedResult = {
        data: [],
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };

      courseService.findAllForLms.mockResolvedValue(mockPaginatedResult);

      const actualResult = await controller.findPublishedCourses(
        inputQuery,
        mockRequestContext,
      );

      expect(actualResult.page).toBe(2);
      expect(actualResult.limit).toBe(10);
      expect(courseService.findAllForLms).toHaveBeenCalledWith(
        {
          page: 2,
          limit: 10,
          status: CourseStatus.PUBLISHED,
        },
        Language.EN,
      );
    });

    it('should combine language filter and search', async () => {
      const inputQuery = { language: Language.FR, search: 'avancé' };
      const mockPaginatedResult = {
        data: [
          {
            ...mockPublishedCourse,
            language: Language.FR,
            title: 'Cours Avancé',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      courseService.findAllForLms.mockResolvedValue(mockPaginatedResult);

      await controller.findPublishedCourses(inputQuery, mockRequestContext);

      expect(courseService.findAllForLms).toHaveBeenCalledWith(
        {
          language: Language.FR,
          search: 'avancé',
          status: CourseStatus.PUBLISHED,
        },
        Language.EN,
      );
    });

    it('should return empty list when no courses match filters', async () => {
      const inputQuery = { search: 'nonexistent' };
      const mockEmptyResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      courseService.findAllForLms.mockResolvedValue(mockEmptyResult);

      const actualResult = await controller.findPublishedCourses(
        inputQuery,
        mockRequestContext,
      );

      expect(actualResult.data).toHaveLength(0);
      expect(actualResult.total).toBe(0);
    });

    it('should pass through all query parameters', async () => {
      const inputQuery = {
        page: 2,
        limit: 10,
        language: Language.FR,
        search: 'NestJS',
      };
      const mockPaginatedResult = {
        data: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
      };

      courseService.findAllForLms.mockResolvedValue(mockPaginatedResult);

      await controller.findPublishedCourses(inputQuery, mockRequestContext);

      expect(courseService.findAllForLms).toHaveBeenCalledWith(
        {
          ...inputQuery,
          status: CourseStatus.PUBLISHED,
        },
        Language.EN,
      );
    });
  });

  describe('findPublishedCourseById', () => {
    it('should return published course with modules and content items', async () => {
      const mockDetailedCourse = {
        ...mockPublishedCourse,
        instructor: {
          id: 'instructor-123',
          email: 'instructor@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        modules: [
          {
            id: 'module-1',
            title: 'Getting Started',
            description: 'Introduction',
            order: 1,
            contentItems: [
              {
                id: 'content-1',
                title: 'What is NestJS?',
                type: ContentType.TEXT,
                order: 1,
                mandatory: true,
              },
              {
                id: 'content-2',
                title: 'Installation',
                type: ContentType.VIDEO,
                order: 2,
                mandatory: true,
              },
            ],
          },
        ],
      };

      courseService.findByIdForLms.mockResolvedValue(mockDetailedCourse as any);

      const actualResult = await controller.findPublishedCourseById(
        mockCourseId,
        mockRequestContext,
      );

      expect(actualResult).toEqual(mockDetailedCourse);
      expect(actualResult.instructor).toBeDefined();
      expect(actualResult.modules).toHaveLength(1);
      expect(actualResult.modules[0].contentItems).toHaveLength(2);
      expect(courseService.findByIdForLms).toHaveBeenCalledWith(
        mockCourseId,
        Language.EN,
      );
    });

    it('should include instructor information', async () => {
      const mockInstructor = {
        id: 'instructor-123',
        email: 'instructor@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const mockDetailedCourse = {
        ...mockPublishedCourse,
        instructor: mockInstructor,
        modules: [],
      };

      courseService.findByIdForLms.mockResolvedValue(mockDetailedCourse as any);

      const actualResult = await controller.findPublishedCourseById(
        mockCourseId,
        mockRequestContext,
      );

      expect(actualResult.instructor).toEqual(mockInstructor);
    });

    it('should return modules in correct order', async () => {
      const mockDetailedCourse = {
        ...mockPublishedCourse,
        instructor: {
          id: 'instructor-123',
          email: 'instructor@example.com',
        },
        modules: [
          { id: 'module-1', title: 'Module 1', order: 1, contentItems: [] },
          { id: 'module-2', title: 'Module 2', order: 2, contentItems: [] },
          { id: 'module-3', title: 'Module 3', order: 3, contentItems: [] },
        ],
      };

      courseService.findByIdForLms.mockResolvedValue(mockDetailedCourse as any);

      const actualResult = await controller.findPublishedCourseById(
        mockCourseId,
        mockRequestContext,
      );

      expect(actualResult.modules[0].order).toBe(1);
      expect(actualResult.modules[1].order).toBe(2);
      expect(actualResult.modules[2].order).toBe(3);
    });

    it('should return content items in correct order within modules', async () => {
      const mockDetailedCourse = {
        ...mockPublishedCourse,
        instructor: {
          id: 'instructor-123',
          email: 'instructor@example.com',
        },
        modules: [
          {
            id: 'module-1',
            title: 'Module 1',
            order: 1,
            contentItems: [
              {
                id: 'content-1',
                title: 'Content 1',
                type: ContentType.TEXT,
                order: 1,
                mandatory: true,
              },
              {
                id: 'content-2',
                title: 'Content 2',
                type: ContentType.VIDEO,
                order: 2,
                mandatory: false,
              },
              {
                id: 'content-3',
                title: 'Content 3',
                type: ContentType.QUIZ,
                order: 3,
                mandatory: true,
              },
            ],
          },
        ],
      };

      courseService.findByIdForLms.mockResolvedValue(mockDetailedCourse as any);

      const actualResult = await controller.findPublishedCourseById(
        mockCourseId,
        mockRequestContext,
      );

      const actualContentItems = actualResult.modules[0].contentItems;
      expect(actualContentItems[0].order).toBe(1);
      expect(actualContentItems[1].order).toBe(2);
      expect(actualContentItems[2].order).toBe(3);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      courseService.findByIdForLms.mockRejectedValue(
        new NotFoundException('Course with ID nonexistent not found'),
      );

      await expect(
        controller.findPublishedCourseById('nonexistent', mockRequestContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when course is in draft status', async () => {
      const mockDraftDetailedCourse = {
        ...mockDraftCourse,
        instructor: {
          id: 'instructor-123',
          email: 'instructor@example.com',
        },
        modules: [],
      };

      courseService.findByIdForLms.mockResolvedValue(
        mockDraftDetailedCourse as any,
      );

      await expect(
        controller.findPublishedCourseById(mockCourseId, mockRequestContext),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.findPublishedCourseById(mockCourseId, mockRequestContext),
      ).rejects.toThrow('Course not found or not available');
    });

    it('should throw NotFoundException when course is archived', async () => {
      const mockArchivedCourse = {
        ...mockPublishedCourse,
        status: CourseStatus.ARCHIVED,
        instructor: {
          id: 'instructor-123',
          email: 'instructor@example.com',
        },
        modules: [],
      };

      courseService.findByIdForLms.mockResolvedValue(mockArchivedCourse as any);

      await expect(
        controller.findPublishedCourseById(mockCourseId, mockRequestContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include course dates when available', async () => {
      const mockEnrollmentStart = new Date('2024-01-01');
      const mockEnrollmentEnd = new Date('2024-12-31');
      const mockCourseStart = new Date('2024-01-15');
      const mockCourseEnd = new Date('2024-06-30');

      const mockDetailedCourse = {
        ...mockPublishedCourse,
        enrollmentStart: mockEnrollmentStart,
        enrollmentEnd: mockEnrollmentEnd,
        courseStart: mockCourseStart,
        courseEnd: mockCourseEnd,
        instructor: {
          id: 'instructor-123',
          email: 'instructor@example.com',
        },
        modules: [],
      };

      courseService.findByIdForLms.mockResolvedValue(mockDetailedCourse as any);

      const actualResult = await controller.findPublishedCourseById(
        mockCourseId,
        mockRequestContext,
      );

      expect(actualResult.enrollmentStart).toEqual(mockEnrollmentStart);
      expect(actualResult.enrollmentEnd).toEqual(mockEnrollmentEnd);
      expect(actualResult.courseStart).toEqual(mockCourseStart);
      expect(actualResult.courseEnd).toEqual(mockCourseEnd);
    });
  });
});
