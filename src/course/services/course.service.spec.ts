import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserRole, Language, CourseStatus } from '@prisma/client';
import { NotificationService } from '../../notification/services/notification.service';
import { I18nService } from 'nestjs-i18n';

describe('CourseService', () => {
  let service: CourseService;
  let prismaService: any;

  const mockInstructorId = 'instructor-123';
  const mockAdminId = 'admin-123';
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        {
          provide: PrismaService,
          useValue: {
            course: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            module: {
              count: jest.fn(),
            },
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendCoursePublishedEmail: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockResolvedValue('translated'),
          },
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a course with required fields', async () => {
      const createDto = {
        title: 'Test Course',
        description: 'Test Description',
        language: Language.EN,
      };

      prismaService.course.create.mockResolvedValue(mockCourse);

      const result = await service.create(createDto, mockInstructorId);

      expect(result).toEqual(mockCourse);
      expect(prismaService.course.create).toHaveBeenCalledWith({
        data: {
          title: createDto.title,
          description: createDto.description,
          language: createDto.language,
          owner: {
            connect: { id: mockInstructorId },
          },
        },
      });
    });

    it('should create a course with all optional date fields', async () => {
      const createDto = {
        title: 'Test Course',
        description: 'Test Description',
        language: Language.EN,
        enrollmentStart: '2024-01-01T00:00:00Z',
        enrollmentEnd: '2024-12-31T23:59:59Z',
        courseStart: '2024-01-15T00:00:00Z',
        courseEnd: '2024-06-30T23:59:59Z',
      };

      prismaService.course.create.mockResolvedValue({
        ...mockCourse,
        enrollmentStart: new Date(createDto.enrollmentStart),
        enrollmentEnd: new Date(createDto.enrollmentEnd),
        courseStart: new Date(createDto.courseStart),
        courseEnd: new Date(createDto.courseEnd),
      });

      const result = await service.create(createDto, mockInstructorId);

      expect(prismaService.course.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createDto.title,
          enrollmentStart: new Date(createDto.enrollmentStart),
          enrollmentEnd: new Date(createDto.enrollmentEnd),
          courseStart: new Date(createDto.courseStart),
          courseEnd: new Date(createDto.courseEnd),
        }),
      });
    });
  });

  describe('update', () => {
    it('should update a course when user is the owner', async () => {
      const updateDto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.course.update.mockResolvedValue({
        ...mockCourse,
        ...updateDto,
      });

      const result = await service.update(
        mockCourseId,
        updateDto,
        mockInstructorId,
        UserRole.INSTRUCTOR,
      );

      expect(result.title).toBe(updateDto.title);
      expect(result.description).toBe(updateDto.description);
      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        data: updateDto,
      });
    });

    it('should update a course when user is admin', async () => {
      const updateDto = {
        title: 'Updated Title',
      };

      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.course.update.mockResolvedValue({
        ...mockCourse,
        ...updateDto,
      });

      const result = await service.update(
        mockCourseId,
        updateDto,
        mockAdminId,
        UserRole.ADMIN,
      );

      expect(result.title).toBe(updateDto.title);
      expect(prismaService.course.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-owner instructor tries to update', async () => {
      const updateDto = {
        title: 'Updated Title',
      };

      prismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.update(
          mockCourseId,
          updateDto,
          'different-instructor-id',
          UserRole.INSTRUCTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      const updateDto = {
        title: 'Updated Title',
      };

      prismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockCourseId, updateDto, mockInstructorId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update course status', async () => {
      const updateDto = {
        status: CourseStatus.PUBLISHED,
      };

      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.course.update.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      });

      const result = await service.update(
        mockCourseId,
        updateDto,
        mockInstructorId,
        UserRole.INSTRUCTOR,
      );

      expect(result.status).toBe(CourseStatus.PUBLISHED);
    });
  });

  describe('delete', () => {
    it('should delete a course when user is the owner', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.course.delete.mockResolvedValue(mockCourse);

      await service.delete(mockCourseId, mockInstructorId, UserRole.INSTRUCTOR);

      expect(prismaService.course.delete).toHaveBeenCalledWith({
        where: { id: mockCourseId },
      });
    });

    it('should delete a course when user is admin', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.course.delete.mockResolvedValue(mockCourse);

      await service.delete(mockCourseId, mockAdminId, UserRole.ADMIN);

      expect(prismaService.course.delete).toHaveBeenCalledWith({
        where: { id: mockCourseId },
      });
    });

    it('should throw ForbiddenException when non-owner instructor tries to delete', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.delete(mockCourseId, 'different-instructor-id', UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      prismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(mockCourseId, mockInstructorId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return a course when it exists', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.findById(mockCourseId);

      expect(result).toEqual(mockCourse);
      expect(prismaService.course.findUnique).toHaveBeenCalledWith({
        where: { id: mockCourseId },
      });
    });

    it('should throw NotFoundException when course does not exist', async () => {
      prismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.findById(mockCourseId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    const mockCourses = [mockCourse];

    it('should return paginated courses with default pagination', async () => {
      prismaService.course.findMany.mockResolvedValue(mockCourses);
      prismaService.course.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toEqual({
        data: mockCourses,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated courses with custom pagination', async () => {
      prismaService.course.findMany.mockResolvedValue(mockCourses);
      prismaService.course.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result).toEqual({
        data: mockCourses,
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5,
      });
      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter courses by language', async () => {
      prismaService.course.findMany.mockResolvedValue(mockCourses);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({ language: Language.FR });

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: { language: Language.FR },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter courses by status', async () => {
      prismaService.course.findMany.mockResolvedValue(mockCourses);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({ status: CourseStatus.PUBLISHED });

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: { status: CourseStatus.PUBLISHED },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search courses by title and description', async () => {
      prismaService.course.findMany.mockResolvedValue(mockCourses);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({ search: 'NestJS' });

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'NestJS', mode: 'insensitive' } },
            { description: { contains: 'NestJS', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter courses by owner for instructors', async () => {
      prismaService.course.findMany.mockResolvedValue(mockCourses);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({}, mockInstructorId, UserRole.INSTRUCTOR);

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: { ownerId: mockInstructorId },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should not filter by owner for admins', async () => {
      prismaService.course.findMany.mockResolvedValue(mockCourses);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({}, mockAdminId, UserRole.ADMIN);

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('validateOwnership', () => {
    it('should return true when user is admin', async () => {
      const result = await service.validateOwnership(
        mockCourseId,
        mockAdminId,
        UserRole.ADMIN,
      );

      expect(result).toBe(true);
      expect(prismaService.course.findUnique).not.toHaveBeenCalled();
    });

    it('should return true when user is the owner', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.validateOwnership(
        mockCourseId,
        mockInstructorId,
        UserRole.INSTRUCTOR,
      );

      expect(result).toBe(true);
    });

    it('should return false when user is not the owner', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.validateOwnership(
        mockCourseId,
        'different-instructor-id',
        UserRole.INSTRUCTOR,
      );

      expect(result).toBe(false);
    });
  });

  describe('publish', () => {
    it('should publish a course when user is the owner and course has modules', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.module.count.mockResolvedValue(2);
      prismaService.course.update.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      });

      const result = await service.publish(
        mockCourseId,
        mockInstructorId,
        UserRole.INSTRUCTOR,
      );

      expect(result.status).toBe(CourseStatus.PUBLISHED);
      expect(prismaService.module.count).toHaveBeenCalledWith({
        where: { courseId: mockCourseId },
      });
      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        data: { status: CourseStatus.PUBLISHED },
      });
    });

    it('should publish a course when user is admin', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.module.count.mockResolvedValue(1);
      prismaService.course.update.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      });

      const result = await service.publish(
        mockCourseId,
        mockAdminId,
        UserRole.ADMIN,
      );

      expect(result.status).toBe(CourseStatus.PUBLISHED);
    });

    it('should throw ForbiddenException when non-owner instructor tries to publish', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.publish(mockCourseId, 'different-instructor-id', UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when course has no modules', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.module.count.mockResolvedValue(0);

      await expect(
        service.publish(mockCourseId, mockInstructorId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      prismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.publish(mockCourseId, mockInstructorId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('should archive a course when user is the owner', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.course.update.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.ARCHIVED,
      });

      const result = await service.archive(
        mockCourseId,
        mockInstructorId,
        UserRole.INSTRUCTOR,
      );

      expect(result.status).toBe(CourseStatus.ARCHIVED);
      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        data: { status: CourseStatus.ARCHIVED },
      });
    });

    it('should archive a course when user is admin', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.course.update.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.ARCHIVED,
      });

      const result = await service.archive(
        mockCourseId,
        mockAdminId,
        UserRole.ADMIN,
      );

      expect(result.status).toBe(CourseStatus.ARCHIVED);
    });

    it('should throw ForbiddenException when non-owner instructor tries to archive', async () => {
      prismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.archive(mockCourseId, 'different-instructor-id', UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      prismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.archive(mockCourseId, mockInstructorId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('date validation', () => {
    it('should create course with valid enrollment and course dates', async () => {
      const createDto = {
        title: 'Test Course',
        description: 'Test Description',
        language: Language.EN,
        enrollmentStart: '2024-01-01T00:00:00Z',
        enrollmentEnd: '2024-12-31T23:59:59Z',
        courseStart: '2024-01-15T00:00:00Z',
        courseEnd: '2024-06-30T23:59:59Z',
      };

      const expectedCourse = {
        ...mockCourse,
        enrollmentStart: new Date(createDto.enrollmentStart),
        enrollmentEnd: new Date(createDto.enrollmentEnd),
        courseStart: new Date(createDto.courseStart),
        courseEnd: new Date(createDto.courseEnd),
      };

      prismaService.course.create.mockResolvedValue(expectedCourse);

      const result = await service.create(createDto, mockInstructorId);

      expect(result.enrollmentStart).toEqual(new Date(createDto.enrollmentStart));
      expect(result.enrollmentEnd).toEqual(new Date(createDto.enrollmentEnd));
      expect(result.courseStart).toEqual(new Date(createDto.courseStart));
      expect(result.courseEnd).toEqual(new Date(createDto.courseEnd));
    });

    it('should update course dates independently', async () => {
      const updateDto = {
        enrollmentStart: '2024-02-01T00:00:00Z',
      };

      prismaService.course.findUnique.mockResolvedValue(mockCourse);
      prismaService.course.update.mockResolvedValue({
        ...mockCourse,
        enrollmentStart: new Date(updateDto.enrollmentStart),
      });

      const result = await service.update(
        mockCourseId,
        updateDto,
        mockInstructorId,
        UserRole.INSTRUCTOR,
      );

      expect(result.enrollmentStart).toEqual(new Date(updateDto.enrollmentStart));
      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        data: { enrollmentStart: new Date(updateDto.enrollmentStart) },
      });
    });
  });

  describe('course filtering and search', () => {
    it('should combine multiple filters', async () => {
      const mockCourses = [mockCourse];
      prismaService.course.findMany.mockResolvedValue(mockCourses);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({
        language: Language.EN,
        status: CourseStatus.PUBLISHED,
        search: 'Test',
      });

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: {
          language: Language.EN,
          status: CourseStatus.PUBLISHED,
          OR: [
            { title: { contains: 'Test', mode: 'insensitive' } },
            { description: { contains: 'Test', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle empty search results', async () => {
      prismaService.course.findMany.mockResolvedValue([]);
      prismaService.course.count.mockResolvedValue(0);

      const result = await service.findAll({ search: 'NonexistentCourse' });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should search by partial title match (Requirement 5.8)', async () => {
      const mockSearchCourse = {
        ...mockCourse,
        title: 'Advanced NestJS Course',
      };
      prismaService.course.findMany.mockResolvedValue([mockSearchCourse]);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({ search: 'nest' });

      expect(prismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'nest', mode: 'insensitive' } },
              { description: { contains: 'nest', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should search by partial description match (Requirement 5.8)', async () => {
      const mockSearchCourse = {
        ...mockCourse,
        description: 'Learn advanced TypeScript patterns',
      };
      prismaService.course.findMany.mockResolvedValue([mockSearchCourse]);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({ search: 'typescript' });

      expect(prismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'typescript', mode: 'insensitive' } },
              { description: { contains: 'typescript', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should perform case-insensitive search (Requirement 5.8)', async () => {
      prismaService.course.findMany.mockResolvedValue([mockCourse]);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAll({ search: 'NESTJS' });

      expect(prismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'NESTJS', mode: 'insensitive' } },
              { description: { contains: 'NESTJS', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findAllForLms', () => {
    it('should return published courses with instructor information', async () => {
      const mockPublishedCourse = {
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
        owner: {
          id: mockInstructorId,
          email: 'instructor@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      prismaService.course.findMany.mockResolvedValue([mockPublishedCourse]);
      prismaService.course.count.mockResolvedValue(1);

      const actualResult = await service.findAllForLms({});

      expect(actualResult.data).toHaveLength(1);
      expect(actualResult.data[0].owner).toBeDefined();
      expect(actualResult.total).toBe(1);
      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: { status: CourseStatus.PUBLISHED },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should filter by language', async () => {
      const mockFrenchCourse = {
        ...mockCourse,
        language: Language.FR,
        status: CourseStatus.PUBLISHED,
        owner: {
          id: mockInstructorId,
          email: 'instructor@example.com',
        },
      };

      prismaService.course.findMany.mockResolvedValue([mockFrenchCourse]);
      prismaService.course.count.mockResolvedValue(1);

      await service.findAllForLms({ language: Language.FR });

      expect(prismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            language: Language.FR,
            status: CourseStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should search by title and description (case-insensitive)', async () => {
      const mockSearchQuery = 'nestjs';
      prismaService.course.findMany.mockResolvedValue([]);
      prismaService.course.count.mockResolvedValue(0);

      await service.findAllForLms({ search: mockSearchQuery });

      expect(prismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: mockSearchQuery, mode: 'insensitive' } },
              { description: { contains: mockSearchQuery, mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should support pagination with custom page and limit', async () => {
      prismaService.course.findMany.mockResolvedValue([]);
      prismaService.course.count.mockResolvedValue(50);

      const actualResult = await service.findAllForLms({ page: 3, limit: 10 });

      expect(actualResult.page).toBe(3);
      expect(actualResult.limit).toBe(10);
      expect(actualResult.totalPages).toBe(5);
      expect(prismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should combine language filter and search', async () => {
      prismaService.course.findMany.mockResolvedValue([]);
      prismaService.course.count.mockResolvedValue(0);

      await service.findAllForLms({
        language: Language.FR,
        search: 'avancé',
      });

      expect(prismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            language: Language.FR,
            status: CourseStatus.PUBLISHED,
            OR: [
              { title: { contains: 'avancé', mode: 'insensitive' } },
              { description: { contains: 'avancé', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should use default pagination of 20 items per page', async () => {
      prismaService.course.findMany.mockResolvedValue([]);
      prismaService.course.count.mockResolvedValue(0);

      await service.findAllForLms({});

      expect(prismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('findByIdForLms', () => {
    it('should return course with instructor and modules structure', async () => {
      const mockDetailedCourse = {
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
        owner: {
          id: mockInstructorId,
          email: 'instructor@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        modules: [
          {
            id: 'module-1',
            title: 'Module 1',
            description: 'First module',
            order: 1,
            contentItems: [
              {
                id: 'content-1',
                title: 'Content 1',
                type: 'TEXT',
                order: 1,
                mandatory: true,
              },
            ],
          },
        ],
      };

      prismaService.course.findUnique.mockResolvedValue(mockDetailedCourse);

      const actualResult = await service.findByIdForLms(mockCourseId);

      expect(actualResult.instructor).toEqual(mockDetailedCourse.owner);
      expect(actualResult.modules).toHaveLength(1);
      expect(actualResult.modules[0].contentItems).toHaveLength(1);
      expect(prismaService.course.findUnique).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          modules: {
            orderBy: { order: 'asc' },
            include: {
              contentItems: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  title: true,
                  type: true,
                  order: true,
                  mandatory: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return modules ordered by order field', async () => {
      const mockDetailedCourse = {
        ...mockCourse,
        owner: {
          id: mockInstructorId,
          email: 'instructor@example.com',
        },
        modules: [
          { id: 'module-1', title: 'Module 1', order: 1, contentItems: [] },
          { id: 'module-2', title: 'Module 2', order: 2, contentItems: [] },
          { id: 'module-3', title: 'Module 3', order: 3, contentItems: [] },
        ],
      };

      prismaService.course.findUnique.mockResolvedValue(mockDetailedCourse);

      const actualResult = await service.findByIdForLms(mockCourseId);

      expect(actualResult.modules[0].order).toBe(1);
      expect(actualResult.modules[1].order).toBe(2);
      expect(actualResult.modules[2].order).toBe(3);
    });

    it('should return content items ordered by order field within modules', async () => {
      const mockDetailedCourse = {
        ...mockCourse,
        owner: {
          id: mockInstructorId,
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
                type: 'TEXT',
                order: 1,
                mandatory: true,
              },
              {
                id: 'content-2',
                title: 'Content 2',
                type: 'VIDEO',
                order: 2,
                mandatory: false,
              },
              {
                id: 'content-3',
                title: 'Content 3',
                type: 'QUIZ',
                order: 3,
                mandatory: true,
              },
            ],
          },
        ],
      };

      prismaService.course.findUnique.mockResolvedValue(mockDetailedCourse);

      const actualResult = await service.findByIdForLms(mockCourseId);

      const actualContentItems = actualResult.modules[0].contentItems;
      expect(actualContentItems[0].order).toBe(1);
      expect(actualContentItems[1].order).toBe(2);
      expect(actualContentItems[2].order).toBe(3);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      prismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.findByIdForLms('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include only selected content item fields', async () => {
      const mockDetailedCourse = {
        ...mockCourse,
        owner: {
          id: mockInstructorId,
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
                type: 'TEXT',
                order: 1,
                mandatory: true,
              },
            ],
          },
        ],
      };

      prismaService.course.findUnique.mockResolvedValue(mockDetailedCourse);

      await service.findByIdForLms(mockCourseId);

      expect(prismaService.course.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            modules: expect.objectContaining({
              include: expect.objectContaining({
                contentItems: expect.objectContaining({
                  select: {
                    id: true,
                    title: true,
                    type: true,
                    order: true,
                    mandatory: true,
                  },
                }),
              }),
            }),
          }),
        }),
      );
    });
  });
});
