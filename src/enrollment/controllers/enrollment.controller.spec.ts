import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from '../services/enrollment.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, EnrollmentStatus, CourseStatus } from '@prisma/client';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { ROLE } from '../../auth/constants/role.constant';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('EnrollmentController', () => {
  let controller: EnrollmentController;
  let service: EnrollmentService;

  const mockEnrollmentService = {
    enroll: jest.fn(),
    unenroll: jest.fn(),
    findByUser: jest.fn(),
    findByCourse: jest.fn(),
    isEnrolled: jest.fn(),
    bulkEnroll: jest.fn(),
    parseCsvForBulkEnroll: jest.fn(),
  };

  const mockRequestContext: RequestContext = {
    user: {
      id: 1,
      username: 'user@test.com',
      roles: [ROLE.LEARNER],
    },
    requestID: 'req-123',
    url: '/enrollments',
    ip: '127.0.0.1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentController],
      providers: [
        {
          provide: EnrollmentService,
          useValue: mockEnrollmentService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EnrollmentController>(EnrollmentController);
    service = module.get<EnrollmentService>(EnrollmentService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('enroll', () => {
    const enrollDto = { courseId: 'course-123' };

    it('should enroll user successfully (Requirement 5.9)', async () => {
      const mockEnrollment = {
        id: 'enrollment-123',
        userId: 'user-123',
        courseId: 'course-123',
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
        completedAt: null,
        course: {
          id: 'course-123',
          title: 'Test Course',
          description: 'Test Description',
          language: 'EN',
        },
      };

      mockEnrollmentService.enroll.mockResolvedValue(mockEnrollment);

      const result = await controller.enroll(enrollDto, mockRequestContext);

      expect(result).toEqual(mockEnrollment);
      expect(mockEnrollmentService.enroll).toHaveBeenCalledWith(
        enrollDto,
        '1',
      );
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockEnrollmentService.enroll.mockRejectedValue(
        new NotFoundException('Course not found'),
      );

      await expect(
        controller.enroll(enrollDto, mockRequestContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if enrollment dates are invalid (Requirement 5.9)', async () => {
      mockEnrollmentService.enroll.mockRejectedValue(
        new BadRequestException('Enrollment has not started yet'),
      );

      await expect(
        controller.enroll(enrollDto, mockRequestContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already enrolled', async () => {
      mockEnrollmentService.enroll.mockRejectedValue(
        new BadRequestException('Already enrolled in this course'),
      );

      await expect(
        controller.enroll(enrollDto, mockRequestContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unenroll', () => {
    const courseId = 'course-123';

    it('should unenroll user successfully (Requirement 5.11)', async () => {
      mockEnrollmentService.unenroll.mockResolvedValue({
        id: 'enrollment-123',
        status: EnrollmentStatus.INACTIVE,
      });

      await controller.unenroll(courseId, mockRequestContext);

      expect(mockEnrollmentService.unenroll).toHaveBeenCalledWith(
        courseId,
        '1',
      );
    });

    it('should throw NotFoundException if no active enrollment found', async () => {
      mockEnrollmentService.unenroll.mockRejectedValue(
        new NotFoundException('Active enrollment not found'),
      );

      await expect(
        controller.unenroll(courseId, mockRequestContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if course is completed (Requirement 5.11)', async () => {
      mockEnrollmentService.unenroll.mockRejectedValue(
        new BadRequestException('Cannot unenroll from completed course'),
      );

      await expect(
        controller.unenroll(courseId, mockRequestContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyEnrollments', () => {
    it('should return all enrollments for current user', async () => {
      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'user-123',
          courseId: 'course-1',
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
          course: {
            id: 'course-1',
            title: 'Course 1',
            description: 'Description 1',
            language: 'EN',
            status: CourseStatus.PUBLISHED,
          },
        },
      ];

      mockEnrollmentService.findByUser.mockResolvedValue(mockEnrollments);

      const result = await controller.getMyEnrollments(
        undefined,
        mockRequestContext,
      );

      expect(result).toEqual(mockEnrollments);
      expect(mockEnrollmentService.findByUser).toHaveBeenCalledWith(
        '1',
        undefined,
      );
    });

    it('should filter by status when provided', async () => {
      mockEnrollmentService.findByUser.mockResolvedValue([]);

      await controller.getMyEnrollments(
        EnrollmentStatus.ACTIVE,
        mockRequestContext,
      );

      expect(mockEnrollmentService.findByUser).toHaveBeenCalledWith(
        '1',
        EnrollmentStatus.ACTIVE,
      );
    });
  });

  describe('getCourseEnrollments', () => {
    const courseId = 'course-123';
    const instructorContext: RequestContext = {
      user: {
        id: 2,
        username: 'instructor@test.com',
        roles: [ROLE.INSTRUCTOR],
      },
      requestID: 'req-123',
      url: '/enrollments',
      ip: '127.0.0.1',
    };

    it('should return course enrollments for instructor', async () => {
      const mockResult = {
        data: [
          {
            id: 'enrollment-1',
            userId: 'user-1',
            courseId,
            status: EnrollmentStatus.ACTIVE,
            user: {
              id: 'user-1',
              email: 'user1@test.com',
              firstName: 'User',
              lastName: '1',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockEnrollmentService.findByCourse.mockResolvedValue(mockResult);

      const result = await controller.getCourseEnrollments(
        courseId,
        1,
        20,
        instructorContext,
      );

      expect(result).toEqual(mockResult);
      expect(mockEnrollmentService.findByCourse).toHaveBeenCalledWith(
        courseId,
        '2',
        UserRole.INSTRUCTOR,
        1,
        20,
      );
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockEnrollmentService.findByCourse.mockRejectedValue(
        new NotFoundException('Course not found'),
      );

      await expect(
        controller.getCourseEnrollments(courseId, 1, 20, instructorContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      mockEnrollmentService.findByCourse.mockRejectedValue(
        new ForbiddenException('Insufficient permissions'),
      );

      await expect(
        controller.getCourseEnrollments(courseId, 1, 20, instructorContext),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkEnrollment', () => {
    const courseId = 'course-123';

    it('should return true if user is enrolled', async () => {
      mockEnrollmentService.isEnrolled.mockResolvedValue(true);

      const result = await controller.checkEnrollment(
        courseId,
        mockRequestContext,
      );

      expect(result).toEqual({ enrolled: true });
      expect(mockEnrollmentService.isEnrolled).toHaveBeenCalledWith(
        courseId,
        '1',
      );
    });

    it('should return false if user is not enrolled', async () => {
      mockEnrollmentService.isEnrolled.mockResolvedValue(false);

      const result = await controller.checkEnrollment(
        courseId,
        mockRequestContext,
      );

      expect(result).toEqual({ enrolled: false });
    });
  });

  describe('bulkEnroll', () => {
    const adminContext: RequestContext = {
      user: {
        id: 3,
        username: 'admin@test.com',
        roles: [ROLE.ADMIN],
      },
      requestID: 'req-123',
      url: '/enrollments',
      ip: '127.0.0.1',
    };

    const bulkEnrollDto = {
      courseId: 'course-123',
      userIds: ['user-1', 'user-2', 'user-3'],
    };

    it('should bulk enroll users successfully', async () => {
      const mockResult = {
        successCount: 3,
        failureCount: 0,
        failures: [],
      };

      mockEnrollmentService.bulkEnroll.mockResolvedValue(mockResult);

      const result = await controller.bulkEnroll(bulkEnrollDto, adminContext);

      expect(result).toEqual(mockResult);
      expect(mockEnrollmentService.bulkEnroll).toHaveBeenCalledWith(
        'course-123',
        ['user-1', 'user-2', 'user-3'],
        '3',
        UserRole.ADMIN,
      );
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      mockEnrollmentService.bulkEnroll.mockRejectedValue(
        new ForbiddenException('Only admins can perform bulk enrollment'),
      );

      await expect(
        controller.bulkEnroll(bulkEnrollDto, mockRequestContext),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('bulkEnrollCsv', () => {
    const adminContext: RequestContext = {
      user: {
        id: 3,
        username: 'admin@test.com',
        roles: [ROLE.ADMIN],
      },
      requestID: 'req-123',
      url: '/enrollments',
      ip: '127.0.0.1',
    };

    const csvBody = {
      courseId: 'course-123',
      csvContent: 'email\nuser1@test.com\nuser2@test.com',
    };

    it('should process CSV and bulk enroll users', async () => {
      const userIds = ['user-1', 'user-2'];
      const mockResult = {
        successCount: 2,
        failureCount: 0,
        failures: [],
      };

      mockEnrollmentService.parseCsvForBulkEnroll.mockResolvedValue(userIds);
      mockEnrollmentService.bulkEnroll.mockResolvedValue(mockResult);

      const result = await controller.bulkEnrollCsv(csvBody, adminContext);

      expect(result).toEqual(mockResult);
      expect(mockEnrollmentService.parseCsvForBulkEnroll).toHaveBeenCalledWith(
        csvBody.csvContent,
      );
      expect(mockEnrollmentService.bulkEnroll).toHaveBeenCalledWith(
        'course-123',
        userIds,
        '3',
        UserRole.ADMIN,
      );
    });

    it('should throw BadRequestException if no valid users found in CSV', async () => {
      mockEnrollmentService.parseCsvForBulkEnroll.mockResolvedValue([]);

      await expect(
        controller.bulkEnrollCsv(csvBody, adminContext),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.bulkEnrollCsv(csvBody, adminContext),
      ).rejects.toThrow('No valid users found in CSV');
    });
  });

  describe('Task 9.3 specific tests', () => {
    describe('unenrollment before completion (Requirement 5.11)', () => {
      const courseId = 'course-123';

      it('should allow unenrollment from active course', async () => {
        mockEnrollmentService.unenroll.mockResolvedValue({
          id: 'enrollment-123',
          status: EnrollmentStatus.INACTIVE,
        });

        await controller.unenroll(courseId, mockRequestContext);

        expect(mockEnrollmentService.unenroll).toHaveBeenCalledWith(
          courseId,
          '1',
        );
      });

      it('should prevent unenrollment from completed course', async () => {
        mockEnrollmentService.unenroll.mockRejectedValue(
          new BadRequestException('Cannot unenroll from completed course'),
        );

        await expect(
          controller.unenroll(courseId, mockRequestContext),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.unenroll(courseId, mockRequestContext),
        ).rejects.toThrow('Cannot unenroll from completed course');
      });
    });

    describe('enrollment date validation (Requirement 5.9)', () => {
      const enrollDto = { courseId: 'course-123' };

      it('should allow enrollment within valid date range', async () => {
        const mockEnrollment = {
          id: 'enrollment-123',
          userId: 'user-123',
          courseId: 'course-123',
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
          completedAt: null,
          course: {
            id: 'course-123',
            title: 'Test Course',
            description: 'Test Description',
            language: 'EN',
          },
        };

        mockEnrollmentService.enroll.mockResolvedValue(mockEnrollment);

        const result = await controller.enroll(enrollDto, mockRequestContext);

        expect(result).toEqual(mockEnrollment);
      });

      it('should reject enrollment before start date', async () => {
        mockEnrollmentService.enroll.mockRejectedValue(
          new BadRequestException('Enrollment has not started yet'),
        );

        await expect(
          controller.enroll(enrollDto, mockRequestContext),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.enroll(enrollDto, mockRequestContext),
        ).rejects.toThrow('Enrollment has not started yet');
      });

      it('should reject enrollment after end date', async () => {
        mockEnrollmentService.enroll.mockRejectedValue(
          new BadRequestException('Enrollment period has ended'),
        );

        await expect(
          controller.enroll(enrollDto, mockRequestContext),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.enroll(enrollDto, mockRequestContext),
        ).rejects.toThrow('Enrollment period has ended');
      });
    });
  });
});
