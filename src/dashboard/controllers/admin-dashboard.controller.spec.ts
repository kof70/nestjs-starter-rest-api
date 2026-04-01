import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import {
  UserRole,
  Language,
  CourseStatus,
  EnrollmentStatus,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;
  let service: AdminDashboardService;

  const mockAdminDashboardService = {
    getDashboardSummary: jest.fn(),
    getUserList: jest.fn(),
    getCourseList: jest.fn(),
    assignRole: jest.fn(),
    bulkEnrollViaCsv: jest.fn(),
    getUserActivity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [
        {
          provide: AdminDashboardService,
          useValue: mockAdminDashboardService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminDashboardController>(
      AdminDashboardController,
    );
    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardSummary', () => {
    it('should return system-wide dashboard summary', async () => {
      const mockSummary = {
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
      };

      mockAdminDashboardService.getDashboardSummary.mockResolvedValue(
        mockSummary,
      );

      const result = await controller.getDashboardSummary();

      expect(result).toEqual(mockSummary);
      expect(service.getDashboardSummary).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserList', () => {
    it('should return paginated user list with default page', async () => {
      const mockUserList = {
        users: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.LEARNER,
            language: Language.EN,
            emailVerified: true,
            coursesOwnedCount: 0,
            activeEnrollmentsCount: 3,
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-03-20'),
          },
        ],
        total: 50,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      };

      mockAdminDashboardService.getUserList.mockResolvedValue(mockUserList);

      const result = await controller.getUserList();

      expect(result).toEqual(mockUserList);
      expect(service.getUserList).toHaveBeenCalledWith(1);
    });

    it('should return paginated user list with specified page', async () => {
      const mockUserList = {
        users: [],
        total: 50,
        page: 3,
        pageSize: 20,
        totalPages: 3,
      };

      mockAdminDashboardService.getUserList.mockResolvedValue(mockUserList);

      const result = await controller.getUserList(3);

      expect(result).toEqual(mockUserList);
      expect(service.getUserList).toHaveBeenCalledWith(3);
    });
  });

  describe('getCourseList', () => {
    it('should return paginated course list with default page', async () => {
      const mockCourseList = {
        courses: [
          {
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
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-03-15'),
          },
        ],
        total: 45,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      };

      mockAdminDashboardService.getCourseList.mockResolvedValue(
        mockCourseList,
      );

      const result = await controller.getCourseList();

      expect(result).toEqual(mockCourseList);
      expect(service.getCourseList).toHaveBeenCalledWith(1);
    });

    it('should return paginated course list with specified page', async () => {
      const mockCourseList = {
        courses: [],
        total: 45,
        page: 2,
        pageSize: 20,
        totalPages: 3,
      };

      mockAdminDashboardService.getCourseList.mockResolvedValue(
        mockCourseList,
      );

      const result = await controller.getCourseList(2);

      expect(result).toEqual(mockCourseList);
      expect(service.getCourseList).toHaveBeenCalledWith(2);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const inputDto = {
        userId: 'user-1',
        role: UserRole.INSTRUCTOR,
      };
      const mockResponse = {
        userId: 'user-1',
        email: 'user@example.com',
        previousRole: UserRole.LEARNER,
        newRole: UserRole.INSTRUCTOR,
        updatedAt: new Date('2024-03-20'),
      };
      mockAdminDashboardService.assignRole.mockResolvedValue(mockResponse);

      const result = await controller.assignRole(inputDto);

      expect(result).toEqual(mockResponse);
      expect(service.assignRole).toHaveBeenCalledWith(inputDto);
    });
  });

  describe('bulkEnrollViaCsv', () => {
    it('should enroll users from CSV file successfully', async () => {
      const mockFile = {
        buffer: Buffer.from('email\nuser1@example.com\nuser2@example.com'),
        originalname: 'users.csv',
        mimetype: 'text/csv',
      } as any;
      const mockResult = {
        successCount: 2,
        failureCount: 0,
        totalProcessed: 2,
        failures: [],
      };
      mockAdminDashboardService.bulkEnrollViaCsv.mockResolvedValue(mockResult);

      const result = await controller.bulkEnrollViaCsv('course-1', mockFile);

      expect(result).toEqual(mockResult);
      expect(service.bulkEnrollViaCsv).toHaveBeenCalledWith(
        'course-1',
        'email\nuser1@example.com\nuser2@example.com',
      );
    });

    it('should throw BadRequestException when file is missing', async () => {
      await expect(
        controller.bulkEnrollViaCsv('course-1', undefined as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.bulkEnrollViaCsv('course-1', undefined as any),
      ).rejects.toThrow('CSV file is required');
    });

    it('should throw BadRequestException when courseId is missing', async () => {
      const mockFile = {
        buffer: Buffer.from('email\nuser1@example.com'),
        originalname: 'users.csv',
        mimetype: 'text/csv',
      } as any;

      await expect(
        controller.bulkEnrollViaCsv(undefined as any, mockFile),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.bulkEnrollViaCsv(undefined as any, mockFile),
      ).rejects.toThrow('Course ID is required');
    });
  });

  describe('getUserActivity', () => {
    it('should return paginated user activity with default page', async () => {
      const mockActivity = {
        activities: [
          {
            userId: 'user-1',
            email: 'user1@example.com',
            name: 'John Doe',
            role: UserRole.LEARNER,
            courseId: 'course-1',
            courseTitle: 'Introduction to TypeScript',
            enrollmentStatus: EnrollmentStatus.ACTIVE,
            progressPercentage: 67.5,
            quizAttempts: 3,
            averageQuizScore: 85.5,
            lastActivityAt: new Date('2024-03-20'),
            enrolledAt: new Date('2024-01-15'),
          },
        ],
        total: 50,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      };
      mockAdminDashboardService.getUserActivity.mockResolvedValue(
        mockActivity,
      );

      const result = await controller.getUserActivity();

      expect(result).toEqual(mockActivity);
      expect(service.getUserActivity).toHaveBeenCalledWith(1);
    });

    it('should return paginated user activity with specified page', async () => {
      const mockActivity = {
        activities: [],
        total: 50,
        page: 2,
        pageSize: 20,
        totalPages: 3,
      };
      mockAdminDashboardService.getUserActivity.mockResolvedValue(
        mockActivity,
      );

      const result = await controller.getUserActivity(2);

      expect(result).toEqual(mockActivity);
      expect(service.getUserActivity).toHaveBeenCalledWith(2);
    });
  });
});
