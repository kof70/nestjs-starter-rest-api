import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { EnrollDto } from '../dtos/enroll.dto';
import { UserRole, EnrollmentStatus, CourseStatus } from '@prisma/client';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Enroll a learner in a course
   * Requirements: 13.1, 13.2, 13.4, 13.5, 13.8
   */
  async enroll(dto: EnrollDto, userId: string) {
    // Verify course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Cannot enroll in unpublished course');
    }

    // Validate enrollment dates (Requirement 13.2)
    const now = new Date();
    if (course.enrollmentStart && now < course.enrollmentStart) {
      throw new BadRequestException(
        `Enrollment has not started yet. Opens on ${course.enrollmentStart.toISOString()}`,
      );
    }

    if (course.enrollmentEnd && now > course.enrollmentEnd) {
      throw new BadRequestException(
        `Enrollment period has ended. Closed on ${course.enrollmentEnd.toISOString()}`,
      );
    }

    // Check for duplicate active enrollment (Requirement 13.4)
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: dto.courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('Already enrolled in this course');
    }

    // Create enrollment (Requirement 13.1, 13.5, 13.8)
    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        courseId: dto.courseId,
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
    // Send welcome email (Requirement 17.1)
    try {
      await this.notificationService.sendWelcomeEmail(userId, dto.courseId);
    } catch (error) {
      this.logger.error(`Failed to send welcome email for enrollment ${enrollment.id}:`, error);
    }
    return enrollment;
  }

  /**
   * Unenroll a learner from a course
   * Requirements: 13.1, 13.5
   */
  async unenroll(courseId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Active enrollment not found');
    }

    // Check if course is completed
    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot unenroll from completed course');
    }

    // Update status to inactive
    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.INACTIVE },
    });
  }

  /**
   * Get all enrollments for a user
   * Requirements: 13.8
   */
  async findByUser(userId: string, status?: EnrollmentStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.enrollment.findMany({
      where,
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
  }

  /**
   * Get all enrollments for a course (instructor/admin view)
   * Requirements: 13.6
   */
  async findByCourse(
    courseId: string,
    userId: string,
    userRole: UserRole,
    page: number = 1,
    limit: number = 20,
  ) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check ownership unless admin
    if (userRole !== UserRole.ADMIN && course.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view enrollments for this course',
      );
    }

    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where: { courseId } }),
    ]);

    return {
      data: enrollments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Check if user is enrolled in a course
   * Requirements: 13.8
   */
  async isEnrolled(courseId: string, userId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    return !!enrollment;
  }

  /**
   * Mark enrollment as completed
   * Requirements: 13.1
   */
  async markAsCompleted(courseId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Active enrollment not found');
    }

    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.COMPLETED },
    });
  }

  /**
   * Bulk enroll users in a course (admin only)
   * Requirements: 13.7
   */
  async bulkEnroll(courseId: string, userIds: string[], adminId: string, adminRole: UserRole) {
    // Verify admin permissions
    if (adminRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can perform bulk enrollment');
    }

    // Verify course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Cannot enroll in unpublished course');
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      failures: [] as Array<{ userId: string; reason: string }>,
    };

    // Process each user enrollment
    for (const userId of userIds) {
      try {
        // Check if user exists
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          results.failureCount++;
          results.failures.push({
            userId,
            reason: 'User not found',
          });
          continue;
        }

        // Check for existing active enrollment
        const existingEnrollment = await this.prisma.enrollment.findFirst({
          where: {
            userId,
            courseId,
            status: EnrollmentStatus.ACTIVE,
          },
        });

        if (existingEnrollment) {
          results.failureCount++;
          results.failures.push({
            userId,
            reason: 'Already enrolled',
          });
          continue;
        }

        // Create enrollment
        await this.prisma.enrollment.create({
          data: {
            userId,
            courseId,
            status: EnrollmentStatus.ACTIVE,
          },
        });

        results.successCount++;
      } catch (error: unknown) {
        results.failureCount++;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.failures.push({
          userId,
          reason: msg,
        });
      }
    }

    return results;
  }

  /**
   * Parse CSV file and extract user IDs or emails
   * Requirements: 13.7
   */
  async parseCsvForBulkEnroll(csvContent: string): Promise<string[]> {
    const lines = csvContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const userIdentifiers: string[] = [];

    if (lines.length === 0) {
      return [];
    }

    // Skip header if present
    const startIndex =
      lines[0].toLowerCase().includes('email') ||
      lines[0].toLowerCase().includes('id')
        ? 1
        : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Extract first column (assuming it's email or ID)
        const identifier = line.split(',')[0].trim();
        if (identifier) {
          userIdentifiers.push(identifier);
        }
      }
    }

    // Convert emails to user IDs if needed
    const userIds: string[] = [];
    for (const identifier of userIdentifiers) {
      // Check if it's a UUID (user ID) or email
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(identifier)) {
        userIds.push(identifier);
      } else {
        // Assume it's an email, look up user
        const user = await this.prisma.user.findUnique({
          where: { email: identifier },
        });
        if (user) {
          userIds.push(user.id);
        }
      }
    }

    return userIds;
  }
}
