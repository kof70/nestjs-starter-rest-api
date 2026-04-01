import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from './course.controller';
import { CourseService } from '../services/course.service';
import { UserRole, Language, CourseStatus } from '@prisma/client';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TeamPermissionGuard } from '../../team/guards/team-permission.guard';
import { TeamActionLogInterceptor } from '../../team/interceptors/team-action-log.interceptor';

describe('CourseController', () => {
  let controller: CourseController;
  let courseService: jest.Mocked<CourseService>;

  const mockInstructorId = 'instructor-123';
  const mockCourseId = 'course-123';

  const mockCourse = {
    id: mockCourseId,
    title: 'Test Course',
    description: 'Test Description',
    language: Language.EN,
    status: CourseStatus.DRAFT,
    enrollmentStart: null,
    enrollmentEnd: null,
    courseStart: null,
    courseEnd: null,
    version: 1,
    ownerId: mockInstructorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequestContext: RequestContext = {
    requestID: 'req-123',
    url: '/cms/courses',
    ip: '127.0.0.1',
    user: {
      id: mockInstructorId,
      email: 'instructor@example.com',
      role: UserRole.INSTRUCTOR,
      language: Language.EN,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            publish: jest.fn(),
            archive: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamPermissionGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(TeamActionLogInterceptor)
      .useValue({
        intercept: (_ctx: unknown, next: { handle: () => unknown }) =>
          next.handle(),
      })
      .compile();

    controller = module.get<CourseController>(CourseController);
    courseService = module.get(CourseService) as jest.Mocked<CourseService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a course', async () => {
      const createDto = {
        title: 'Test Course',
        description: 'Test Description',
        language: Language.EN,
      };

      courseService.create.mockResolvedValue(mockCourse);

      const result = await controller.create(createDto, mockRequestContext);

      expect(result).toEqual(mockCourse);
      expect(courseService.create).toHaveBeenCalledWith(
        createDto,
        mockInstructorId,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated courses', async () => {
      const query = { page: 1, limit: 20 };
      const paginatedResult = {
        data: [mockCourse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      courseService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query, mockRequestContext);

      expect(result).toEqual(paginatedResult);
      expect(courseService.findAll).toHaveBeenCalledWith(
        query,
        mockInstructorId,
        UserRole.INSTRUCTOR,
      );
    });

    it('should pass filters to service', async () => {
      const query = {
        page: 1,
        limit: 20,
        language: Language.FR,
        status: CourseStatus.PUBLISHED,
        search: 'NestJS',
      };
      const paginatedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      courseService.findAll.mockResolvedValue(paginatedResult);

      await controller.findAll(query, mockRequestContext);

      expect(courseService.findAll).toHaveBeenCalledWith(
        query,
        mockInstructorId,
        UserRole.INSTRUCTOR,
      );
    });
  });

  describe('findById', () => {
    it('should return a course by id', async () => {
      courseService.findById.mockResolvedValue(mockCourse);

      const result = await controller.findById(
        mockCourseId,
        mockRequestContext,
      );

      expect(result).toEqual(mockCourse);
      expect(courseService.findById).toHaveBeenCalledWith(
        mockCourseId,
        Language.EN,
      );
    });
  });

  describe('update', () => {
    it('should update a course', async () => {
      const updateDto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const updatedCourse = {
        ...mockCourse,
        ...updateDto,
      };

      courseService.update.mockResolvedValue(updatedCourse);

      const result = await controller.update(
        mockCourseId,
        updateDto,
        mockRequestContext,
      );

      expect(result).toEqual(updatedCourse);
      expect(courseService.update).toHaveBeenCalledWith(
        mockCourseId,
        updateDto,
        mockInstructorId,
        UserRole.INSTRUCTOR,
        Language.EN,
      );
    });
  });

  describe('delete', () => {
    it('should delete a course', async () => {
      courseService.delete.mockResolvedValue(undefined);

      await controller.delete(mockCourseId, mockRequestContext);

      expect(courseService.delete).toHaveBeenCalledWith(
        mockCourseId,
        mockInstructorId,
        UserRole.INSTRUCTOR,
        Language.EN,
      );
    });
  });

  describe('publish', () => {
    it('should publish a course', async () => {
      const publishedCourse = {
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      };

      courseService.publish.mockResolvedValue(publishedCourse);

      const result = await controller.publish(mockCourseId, mockRequestContext);

      expect(result).toEqual(publishedCourse);
      expect(courseService.publish).toHaveBeenCalledWith(
        mockCourseId,
        mockInstructorId,
        UserRole.INSTRUCTOR,
        Language.EN,
      );
    });
  });

  describe('archive', () => {
    it('should archive a course', async () => {
      const archivedCourse = {
        ...mockCourse,
        status: CourseStatus.ARCHIVED,
      };

      courseService.archive.mockResolvedValue(archivedCourse);

      const result = await controller.archive(mockCourseId, mockRequestContext);

      expect(result).toEqual(archivedCourse);
      expect(courseService.archive).toHaveBeenCalledWith(
        mockCourseId,
        mockInstructorId,
        UserRole.INSTRUCTOR,
        Language.EN,
      );
    });
  });
});
