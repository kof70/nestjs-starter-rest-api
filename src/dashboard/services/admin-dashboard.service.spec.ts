import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  UserRole,
  Language,
  CourseStatus,
  EnrollmentStatus,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    course: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
    },
    enrollment: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    certificate: {
      count: jest.fn(),
    },
    quizAttempt: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    module: {
      findMany: jest.fn(),
    },
    contentItem: {
      findMany: jest.fn(),
    },
    progress: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardSummary', () => {
    it('should return system-wide dashboard summary', async () => {
      mockPrismaService.user.count.mockResolvedValue(1250);
      mockPrismaService.course.count.mockResolvedValue(45);
      mockPrismaService.enrollment.count
        .mockResolvedValueOnce(3420)
        .mockResolvedValueOnce(2890)
        .mockResolvedValueOnce(450);
      mockPrismaService.user.groupBy.mockResolvedValue([
        { role: UserRole.ADMIN, _count: { role: 5 } },
        { role: UserRole.INSTRUCTOR, _count: { role: 50 } },
        { role: UserRole.LEARNER, _count: { role: 1195 } },
      ]);
      mockPrismaService.course.groupBy.mockResolvedValue([
        { status: CourseStatus.DRAFT, _count: { status: 10 } },
        { status: CourseStatus.PUBLISHED, _count: { status: 30 } },
        { status: CourseStatus.ARCHIVED, _count: { status: 5 } },
      ]);
      mockPrismaService.certificate.count.mockResolvedValue(450);
      (mockPrismaService as any).quizAttempt.count.mockResolvedValue(8750);

      const result = await service.getDashboardSummary();

      expect(result).toEqual({
        totalUsers: 1250,
        totalCourses: 45,
        totalEnrollments: 3420,
        activeEnrollments: 2890,
        completedEnrollments: 450,
        usersByRole: {
          ADMIN: 5,
          INSTRUCTOR: 50,
          LEARNER: 1195,
        },
        coursesByStatus: {
          DRAFT: 10,
          PUBLISHED: 30,
          ARCHIVED: 5,
        },
        overallCompletionRate: 13.16,
        totalCertificates: 450,
        totalQuizAttempts: 8750,
      });
    });

    it('should handle zero enrollments gracefully', async () => {
      mockPrismaService.user.count.mockResolvedValue(10);
      mockPrismaService.course.count.mockResolvedValue(5);
      mockPrismaService.enrollment.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.user.groupBy.mockResolvedValue([
        { role: UserRole.ADMIN, _count: { role: 2 } },
        { role: UserRole.INSTRUCTOR, _count: { role: 3 } },
        { role: UserRole.LEARNER, _count: { role: 5 } },
      ]);
      mockPrismaService.course.groupBy.mockResolvedValue([
        { status: CourseStatus.DRAFT, _count: { status: 5 } },
      ]);
      mockPrismaService.certificate.count.mockResolvedValue(0);
      (mockPrismaService as any).quizAttempt.count.mockResolvedValue(0);

      const result = await service.getDashboardSummary();

      expect(result.overallCompletionRate).toBe(0);
      expect(result.totalEnrollments).toBe(0);
    });
  });

  describe('getUserList', () => {
    it('should return paginated user list', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.LEARNER,
          language: Language.EN,
          emailVerified: true,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-03-20'),
          _count: {
            coursesOwned: 0,
            enrollments: 3,
          },
        },
        {
          id: 'user-2',
          email: 'instructor@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: UserRole.INSTRUCTOR,
          language: Language.FR,
          emailVerified: true,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-03-15'),
          _count: {
            coursesOwned: 5,
            enrollments: 0,
          },
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(50);

      const result = await service.getUserList(1);

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(3);
      expect(result.users[0]).toEqual({
        id: 'user-1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.LEARNER,
        language: Language.EN,
        emailVerified: true,
        coursesOwnedCount: 0,
        activeEnrollmentsCount: 3,
        createdAt: mockUsers[0].createdAt,
        updatedAt: mockUsers[0].updatedAt,
      });
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(100);

      const result = await service.getUserList(3);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 40,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              coursesOwned: true,
              enrollments: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      });
      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('getCourseList', () => {
    it('should return paginated course list', async () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Introduction to Web Development',
          description: 'Learn web development basics',
          language: Language.EN,
          status: CourseStatus.PUBLISHED,
          ownerId: 'owner-1',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-03-15'),
          owner: {
            email: 'instructor@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
          },
          _count: {
            modules: 8,
            enrollments: 125,
          },
        },
      ];

      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);
      mockPrismaService.course.count.mockResolvedValue(45);
      mockPrismaService.enrollment.count.mockResolvedValue(45);

      const result = await service.getCourseList(1);

      expect(result.courses).toHaveLength(1);
      expect(result.total).toBe(45);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(3);
      expect(result.courses[0]).toMatchObject({
        id: 'course-1',
        title: 'Introduction to Web Development',
        description: 'Learn web development basics',
        language: Language.EN,
        status: CourseStatus.PUBLISHED,
        ownerId: 'owner-1',
        ownerEmail: 'instructor@example.com',
        ownerName: 'Jane Smith',
        moduleCount: 8,
        enrollmentCount: 125,
        completedEnrollmentCount: 45,
      });
    });

    it('should handle courses with null owner names', async () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Test Course',
          description: null,
          language: Language.EN,
          status: CourseStatus.DRAFT,
          ownerId: 'owner-1',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-03-15'),
          owner: {
            email: 'test@example.com',
            firstName: null,
            lastName: null,
          },
          _count: {
            modules: 0,
            enrollments: 0,
          },
        },
      ];

      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);
      mockPrismaService.course.count.mockResolvedValue(1);
      mockPrismaService.enrollment.count.mockResolvedValue(0);

      const result = await service.getCourseList(1);

      expect(result.courses[0].ownerName).toBe('N/A');
      expect(result.courses[0].description).toBeUndefined();
    });
  });

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.LEARNER,
      };
      const mockUpdatedUser = {
        ...mockUser,
        role: UserRole.INSTRUCTOR,
        updatedAt: new Date('2024-03-20'),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.assignRole({
        userId: 'user-1',
        role: UserRole.INSTRUCTOR,
      });

      expect(result).toEqual({
        userId: 'user-1',
        email: 'user@example.com',
        previousRole: UserRole.LEARNER,
        newRole: UserRole.INSTRUCTOR,
        updatedAt: mockUpdatedUser.updatedAt,
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: UserRole.INSTRUCTOR },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignRole({
          userId: 'nonexistent',
          role: UserRole.INSTRUCTOR,
        }),
      ).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when user already has role', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.INSTRUCTOR,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.assignRole({
          userId: 'user-1',
          role: UserRole.INSTRUCTOR,
        }),
      ).rejects.toThrow('User already has this role');
    });
  });

  describe('bulkEnrollViaCsv', () => {
    it('should enroll users successfully from CSV', async () => {
      const csvContent = 'email\nuser1@example.com\nuser2@example.com';
      const mockCourse = {
        id: 'course-1',
        status: CourseStatus.PUBLISHED,
      };
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'user1@example.com' })
        .mockResolvedValueOnce({ id: 'user-2', email: 'user2@example.com' });
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({});

      const result = await service.bulkEnrollViaCsv('course-1', csvContent);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.totalProcessed).toBe(2);
      expect(result.failures).toHaveLength(0);
      expect(mockPrismaService.enrollment.create).toHaveBeenCalledTimes(2);
    });

    it('should handle user not found errors', async () => {
      const csvContent = 'email\nnonexistent@example.com';
      const mockCourse = {
        id: 'course-1',
        status: CourseStatus.PUBLISHED,
      };
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.bulkEnrollViaCsv('course-1', csvContent);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0]).toEqual({
        identifier: 'nonexistent@example.com',
        reason: 'User not found',
      });
    });

    it('should handle already enrolled users', async () => {
      const csvContent = 'email\nuser1@example.com';
      const mockCourse = {
        id: 'course-1',
        status: CourseStatus.PUBLISHED,
      };
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user1@example.com',
      });
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });

      const result = await service.bulkEnrollViaCsv('course-1', csvContent);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0]).toEqual({
        identifier: 'user1@example.com',
        reason: 'Already enrolled',
      });
    });

    it('should throw NotFoundException when course not found', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkEnrollViaCsv('nonexistent', 'email\nuser@example.com'),
      ).rejects.toThrow('Course not found');
    });

    it('should throw BadRequestException for unpublished course', async () => {
      const mockCourse = {
        id: 'course-1',
        status: CourseStatus.DRAFT,
      };
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.bulkEnrollViaCsv('course-1', 'email\nuser@example.com'),
      ).rejects.toThrow('Cannot enroll in unpublished course');
    });
  });

  describe('getUserActivity', () => {
    it('should return paginated user activity', async () => {
      const mockEnrollments = [
        {
          userId: 'user-1',
          courseId: 'course-1',
          status: 'ACTIVE',
          enrolledAt: new Date('2024-01-15'),
          user: {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.LEARNER,
          },
          course: {
            id: 'course-1',
            title: 'Introduction to TypeScript',
          },
        },
      ];
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.enrollment.count.mockResolvedValue(50);
      mockPrismaService.module.findMany.mockResolvedValue([
        {
          id: 'module-1',
          contentItems: [{ id: 'content-1', mandatory: true }],
        },
      ]);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.contentItem.findMany.mockResolvedValue([]);
      (mockPrismaService as any).quizAttempt.findMany.mockResolvedValue([]);
      mockPrismaService.progress.findFirst.mockResolvedValue({
        completedAt: new Date('2024-03-20'),
      });

      const result = await service.getUserActivity(1);

      expect(result.activities).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(3);
      expect(result.activities[0]).toMatchObject({
        userId: 'user-1',
        email: 'user1@example.com',
        name: 'John Doe',
        role: UserRole.LEARNER,
        courseId: 'course-1',
        courseTitle: 'Introduction to TypeScript',
        enrollmentStatus: 'ACTIVE',
        progressPercentage: 100,
        quizAttempts: 0,
      });
    });

    it('should handle users with no names', async () => {
      const mockEnrollments = [
        {
          userId: 'user-1',
          courseId: 'course-1',
          status: 'ACTIVE',
          enrolledAt: new Date('2024-01-15'),
          user: {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: null,
            lastName: null,
            role: UserRole.LEARNER,
          },
          course: {
            id: 'course-1',
            title: 'Test Course',
          },
        },
      ];
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.enrollment.count.mockResolvedValue(1);
      mockPrismaService.module.findMany.mockResolvedValue([]);
      mockPrismaService.contentItem.findMany.mockResolvedValue([]);
      (mockPrismaService as any).quizAttempt.findMany.mockResolvedValue([]);
      mockPrismaService.progress.findFirst.mockResolvedValue(null);

      const result = await service.getUserActivity(1);

      expect(result.activities[0].name).toBeUndefined();
    });

    it('should calculate quiz statistics correctly', async () => {
      const mockEnrollments = [
        {
          userId: 'user-1',
          courseId: 'course-1',
          status: 'ACTIVE',
          enrolledAt: new Date('2024-01-15'),
          user: {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.LEARNER,
          },
          course: {
            id: 'course-1',
            title: 'Test Course',
          },
        },
      ];
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrismaService.enrollment.count.mockResolvedValue(1);
      mockPrismaService.module.findMany.mockResolvedValue([
        { id: 'module-1', contentItems: [] },
      ]);
      mockPrismaService.contentItem.findMany.mockResolvedValue([
        { quiz: { id: 'quiz-1' } },
      ]);
      (mockPrismaService as any).quizAttempt.findMany.mockResolvedValue([
        { score: 80 },
        { score: 90 },
        { score: 85 },
      ]);
      mockPrismaService.progress.count.mockResolvedValue(0);
      mockPrismaService.progress.findFirst.mockResolvedValue(null);

      const result = await service.getUserActivity(1);

      expect(result.activities[0].quizAttempts).toBe(3);
      expect(result.activities[0].averageQuizScore).toBe(85);
    });
  });
});
