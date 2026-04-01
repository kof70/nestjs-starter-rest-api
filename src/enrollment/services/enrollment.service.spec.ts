import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, EnrollmentStatus, CourseStatus } from '@prisma/client';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    course: {
      findUnique: jest.fn(),
    },
    enrollment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockNotificationService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enroll', () => {
    const userId = 'user-123';
    const courseId = 'course-123';
    const enrollDto = { courseId };

    const mockCourse = {
      id: courseId,
      title: 'Test Course',
      status: CourseStatus.PUBLISHED,
      enrollmentStart: null,
      enrollmentEnd: null,
    };

    it('should enroll user successfully (Requirement 13.1, 13.5, 13.8)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
        completedAt: null,
        course: {
          id: courseId,
          title: 'Test Course',
        },
      });

      const result = await service.enroll(enrollDto, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
      expect(mockPrismaService.enrollment.create).toHaveBeenCalledWith({
        data: {
          userId,
          courseId,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
              language: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if course is not published', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.DRAFT,
      });

      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        'Cannot enroll in unpublished course',
      );
    });

    it('should throw BadRequestException if enrollment has not started (Requirement 13.2)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        enrollmentStart: futureDate,
      });

      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if enrollment has ended (Requirement 13.2)', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        enrollmentEnd: pastDate,
      });

      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already enrolled (Requirement 13.4)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        id: 'existing-enrollment',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      });

      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        'Already enrolled in this course',
      );
    });

    it('should allow enrollment if previous enrollment was inactive', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      });

      const result = await service.enroll(enrollDto, userId);

      expect(result).toBeDefined();
    });
  });

  describe('unenroll', () => {
    const userId = 'user-123';
    const courseId = 'course-123';

    it('should unenroll user successfully (Requirement 13.1, 13.5)', async () => {
      const mockEnrollment = {
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.enrollment.update.mockResolvedValue({
        ...mockEnrollment,
        status: EnrollmentStatus.INACTIVE,
      });

      const result = await service.unenroll(courseId, userId);

      expect(result.status).toBe(EnrollmentStatus.INACTIVE);
      expect(mockPrismaService.enrollment.update).toHaveBeenCalledWith({
        where: { id: mockEnrollment.id },
        data: { status: EnrollmentStatus.INACTIVE },
      });
    });

    it('should throw NotFoundException if no active enrollment found', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.unenroll(courseId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if course is completed', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.COMPLETED,
      });

      await expect(service.unenroll(courseId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByUser', () => {
    const userId = 'user-123';

    it('should return all enrollments for user (Requirement 13.8)', async () => {
      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId,
          courseId: 'course-1',
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
          course: {
            id: 'course-1',
            title: 'Course 1',
          },
        },
        {
          id: 'enrollment-2',
          userId,
          courseId: 'course-2',
          status: EnrollmentStatus.COMPLETED,
          enrolledAt: new Date(),
          course: {
            id: 'course-2',
            title: 'Course 2',
          },
        },
      ];

      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);

      const result = await service.findByUser(userId);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
              language: true,
              status: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });
    });

    it('should filter by status when provided', async () => {
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);

      await service.findByUser(userId, EnrollmentStatus.ACTIVE);

      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, status: EnrollmentStatus.ACTIVE },
        }),
      );
    });
  });

  describe('findByCourse', () => {
    const courseId = 'course-123';
    const instructorId = 'instructor-123';

    const mockCourse = {
      id: courseId,
      ownerId: instructorId,
    };

    it('should return enrollments for course (Requirement 13.6)', async () => {
      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'user-1',
          courseId,
          status: EnrollmentStatus.ACTIVE,
          user: {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'User',
            lastName: '1',
          },
        },
      ];

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.enrollment.count.mockResolvedValue(1);

      const result = await service.findByCourse(
        courseId,
        instructorId,
        UserRole.INSTRUCTOR,
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.findByCourse(courseId, instructorId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        ownerId: 'different-instructor',
      });

      await expect(
        service.findByCourse(courseId, instructorId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any course enrollments', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        ownerId: 'different-instructor',
      });
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);
      mockPrismaService.enrollment.count.mockResolvedValue(0);

      const result = await service.findByCourse(
        courseId,
        instructorId,
        UserRole.ADMIN,
      );

      expect(result).toBeDefined();
    });
  });

  describe('isEnrolled', () => {
    const userId = 'user-123';
    const courseId = 'course-123';

    it('should return true if user is enrolled (Requirement 13.8)', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      });

      const result = await service.isEnrolled(courseId, userId);

      expect(result).toBe(true);
    });

    it('should return false if user is not enrolled', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);

      const result = await service.isEnrolled(courseId, userId);

      expect(result).toBe(false);
    });
  });

  describe('markAsCompleted', () => {
    const userId = 'user-123';
    const courseId = 'course-123';

    it('should mark enrollment as completed (Requirement 13.1)', async () => {
      const mockEnrollment = {
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      };

      mockPrismaService.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      mockPrismaService.enrollment.update.mockResolvedValue({
        ...mockEnrollment,
        status: EnrollmentStatus.COMPLETED,
      });

      const result = await service.markAsCompleted(courseId, userId);

      expect(result.status).toBe(EnrollmentStatus.COMPLETED);
    });

    it('should throw NotFoundException if no active enrollment found', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.markAsCompleted(courseId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkEnroll', () => {
    const courseId = 'course-123';
    const adminId = 'admin-123';
    const userIds = ['user-1', 'user-2', 'user-3'];

    const mockCourse = {
      id: courseId,
      title: 'Test Course',
      status: CourseStatus.PUBLISHED,
    };

    it('should successfully enroll multiple users (Requirement 13.7)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'user1@test.com' })
        .mockResolvedValueOnce({ id: 'user-2', email: 'user2@test.com' })
        .mockResolvedValueOnce({ id: 'user-3', email: 'user3@test.com' });

      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId: 'user-1',
        courseId,
        status: EnrollmentStatus.ACTIVE,
      });

      const result = await service.bulkEnroll(
        courseId,
        userIds,
        adminId,
        UserRole.ADMIN,
      );

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.failures).toHaveLength(0);
      expect(mockPrismaService.enrollment.create).toHaveBeenCalledTimes(3);
    });

    it('should throw ForbiddenException if user is not admin (Requirement 13.7)', async () => {
      await expect(
        service.bulkEnroll(courseId, userIds, adminId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.bulkEnroll(courseId, userIds, adminId, UserRole.INSTRUCTOR),
      ).rejects.toThrow('Only admins can perform bulk enrollment');
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkEnroll(courseId, userIds, adminId, UserRole.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if course is not published', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.DRAFT,
      });

      await expect(
        service.bulkEnroll(courseId, userIds, adminId, UserRole.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle non-existent users gracefully (Requirement 13.7)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'user1@test.com' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-3', email: 'user3@test.com' });

      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId: 'user-1',
        courseId,
        status: EnrollmentStatus.ACTIVE,
      });

      const result = await service.bulkEnroll(
        courseId,
        userIds,
        adminId,
        UserRole.ADMIN,
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toEqual({
        userId: 'user-2',
        reason: 'User not found',
      });
    });

    it('should handle already enrolled users (Requirement 13.4, 13.8)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'user1@test.com' })
        .mockResolvedValueOnce({ id: 'user-2', email: 'user2@test.com' })
        .mockResolvedValueOnce({ id: 'user-3', email: 'user3@test.com' });

      mockPrismaService.enrollment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'existing-enrollment',
          userId: 'user-2',
          courseId,
          status: EnrollmentStatus.ACTIVE,
        })
        .mockResolvedValueOnce(null);

      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId: 'user-1',
        courseId,
        status: EnrollmentStatus.ACTIVE,
      });

      const result = await service.bulkEnroll(
        courseId,
        userIds,
        adminId,
        UserRole.ADMIN,
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toEqual({
        userId: 'user-2',
        reason: 'Already enrolled',
      });
    });

    it('should handle database errors during enrollment', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'user1@test.com' })
        .mockResolvedValueOnce({ id: 'user-2', email: 'user2@test.com' });

      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create
        .mockResolvedValueOnce({
          id: 'enrollment-123',
          userId: 'user-1',
          courseId,
          status: EnrollmentStatus.ACTIVE,
        })
        .mockRejectedValueOnce(new Error('Database connection error'));

      const result = await service.bulkEnroll(
        courseId,
        ['user-1', 'user-2'],
        adminId,
        UserRole.ADMIN,
      );

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toBe('Database connection error');
    });

    it('should handle empty user list', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.bulkEnroll(
        courseId,
        [],
        adminId,
        UserRole.ADMIN,
      );

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.failures).toHaveLength(0);
    });
  });

  describe('parseCsvForBulkEnroll', () => {
    it('should parse CSV with user IDs (Requirement 13.7)', async () => {
      const csvContent = `id
123e4567-e89b-12d3-a456-426614174000
223e4567-e89b-12d3-a456-426614174001
323e4567-e89b-12d3-a456-426614174002`;

      const result = await service.parseCsvForBulkEnroll(csvContent);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should parse CSV with emails and convert to user IDs (Requirement 13.7)', async () => {
      const csvContent = `email
user1@test.com
user2@test.com
user3@test.com`;

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'user1@test.com' })
        .mockResolvedValueOnce({ id: 'user-2', email: 'user2@test.com' })
        .mockResolvedValueOnce({ id: 'user-3', email: 'user3@test.com' });

      const result = await service.parseCsvForBulkEnroll(csvContent);

      expect(result).toHaveLength(3);
      expect(result).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should handle CSV without header', async () => {
      const csvContent = `123e4567-e89b-12d3-a456-426614174000
223e4567-e89b-12d3-a456-426614174001`;

      const result = await service.parseCsvForBulkEnroll(csvContent);

      expect(result).toHaveLength(2);
    });

    it('should skip empty lines in CSV', async () => {
      const csvContent = `id
123e4567-e89b-12d3-a456-426614174000

223e4567-e89b-12d3-a456-426614174001

`;

      const result = await service.parseCsvForBulkEnroll(csvContent);

      expect(result).toHaveLength(2);
    });

    it('should handle CSV with multiple columns (use first column)', async () => {
      const csvContent = `email,name,role
user1@test.com,User One,learner
user2@test.com,User Two,learner`;

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'user1@test.com' })
        .mockResolvedValueOnce({ id: 'user-2', email: 'user2@test.com' });

      const result = await service.parseCsvForBulkEnroll(csvContent);

      expect(result).toHaveLength(2);
    });

    it('should handle non-existent email addresses', async () => {
      const csvContent = `email
user1@test.com
nonexistent@test.com
user3@test.com`;

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'user1@test.com' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-3', email: 'user3@test.com' });

      const result = await service.parseCsvForBulkEnroll(csvContent);

      expect(result).toHaveLength(2);
      expect(result).toEqual(['user-1', 'user-3']);
    });

    it('should handle empty CSV content', async () => {
      const csvContent = '';

      const result = await service.parseCsvForBulkEnroll(csvContent);

      expect(result).toHaveLength(0);
    });

    it('should handle CSV with only header', async () => {
      const csvContent = 'email';

      const result = await service.parseCsvForBulkEnroll(csvContent);

      expect(result).toHaveLength(0);
    });
  });

  describe('enrollment date validation edge cases', () => {
    const userId = 'user-123';
    const courseId = 'course-123';
    const enrollDto = { courseId };

    const mockCourse = {
      id: courseId,
      title: 'Test Course',
      status: CourseStatus.PUBLISHED,
      enrollmentStart: null,
      enrollmentEnd: null,
    };

    it('should allow enrollment on exact start date (Requirement 13.2)', async () => {
      const now = new Date();
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        enrollmentStart: now,
      });
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      });

      const result = await service.enroll(enrollDto, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
    });

    it('should allow enrollment on exact end date (Requirement 13.2)', async () => {
      const now = new Date();
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        enrollmentEnd: now,
      });
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      });

      const result = await service.enroll(enrollDto, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
    });

    it('should allow enrollment within valid date range (Requirement 13.2)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        enrollmentStart: yesterday,
        enrollmentEnd: tomorrow,
      });
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      });

      const result = await service.enroll(enrollDto, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
    });

    it('should reject enrollment one second before start date (Requirement 13.2)', async () => {
      const futureDate = new Date();
      futureDate.setSeconds(futureDate.getSeconds() + 1);

      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        enrollmentStart: futureDate,
      });

      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject enrollment one second after end date (Requirement 13.2)', async () => {
      const pastDate = new Date();
      pastDate.setSeconds(pastDate.getSeconds() - 1);

      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        enrollmentEnd: pastDate,
      });

      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('duplicate enrollment prevention', () => {
    const userId = 'user-123';
    const courseId = 'course-123';
    const enrollDto = { courseId };

    const mockCourse = {
      id: courseId,
      title: 'Test Course',
      status: CourseStatus.PUBLISHED,
      enrollmentStart: null,
      enrollmentEnd: null,
    };

    it('should prevent duplicate active enrollment (Requirement 13.4, 13.8)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        id: 'existing-enrollment',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      });

      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.enroll(enrollDto, userId)).rejects.toThrow(
        'Already enrolled in this course',
      );

      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });

    it('should allow re-enrollment after unenrollment (Requirement 13.5)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      });

      const result = await service.enroll(enrollDto, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
    });

    it('should allow enrollment if previous enrollment was completed', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment-123',
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      });

      const result = await service.enroll(enrollDto, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
    });
  });

  describe('pagination in findByCourse', () => {
    const courseId = 'course-123';
    const instructorId = 'instructor-123';

    const mockCourse = {
      id: courseId,
      ownerId: instructorId,
    };

    it('should return first page with default pagination (Requirement 13.6)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);
      mockPrismaService.enrollment.count.mockResolvedValue(50);

      const result = await service.findByCourse(
        courseId,
        instructorId,
        UserRole.INSTRUCTOR,
      );

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(3);
      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should return correct page with custom pagination', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);
      mockPrismaService.enrollment.count.mockResolvedValue(100);

      const result = await service.findByCourse(
        courseId,
        instructorId,
        UserRole.INSTRUCTOR,
        3,
        10,
      );

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(10);
      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });
});
