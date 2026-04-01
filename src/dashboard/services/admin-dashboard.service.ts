import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserRole, CourseStatus, EnrollmentStatus } from '@prisma/client';
import { AdminDashboardSummaryDto } from '../dtos/admin-dashboard-summary.dto';
import {
  AdminUserListDto,
  AdminUserItemDto,
} from '../dtos/admin-user-list.dto';
import {
  AdminCourseListDto,
  AdminCourseItemDto,
} from '../dtos/admin-course-list.dto';
import {
  AssignRoleDto,
  AssignRoleResponseDto,
} from '../dtos/assign-role.dto';
import { BulkEnrollCsvResultDto } from '../dtos/bulk-enroll-csv.dto';
import {
  UserActivityListDto,
  UserActivityItemDto,
} from '../dtos/user-activity.dto';

/**
 * Service for admin dashboard analytics and system-wide statistics
 * Requirements: 8.7
 */
@Injectable()
export class AdminDashboardService {
  private readonly DEFAULT_PAGE_SIZE = 20;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get system-wide dashboard summary statistics
   * Requirements: 8.7
   */
  async getDashboardSummary(): Promise<AdminDashboardSummaryDto> {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      usersByRole,
      coursesByStatus,
      totalCertificates,
      totalQuizAttempts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
      this.getUsersByRole(),
      this.getCoursesByStatus(),
      this.prisma.certificate.count(),
      (this.prisma as any).quizAttempt.count(),
    ]);

    const overallCompletionRate =
      totalEnrollments > 0
        ? (completedEnrollments / totalEnrollments) * 100
        : 0;

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      usersByRole,
      coursesByStatus,
      overallCompletionRate: Math.round(overallCompletionRate * 100) / 100,
      totalCertificates,
      totalQuizAttempts,
    };
  }

  /**
   * Get paginated list of all users
   * Requirements: 8.7
   */
  async getUserList(page: number = 1): Promise<AdminUserListDto> {
    const pageSize = this.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
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
      }),
      this.prisma.user.count(),
    ]);

    const userItems: AdminUserItemDto[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role: user.role,
      language: user.language,
      emailVerified: user.emailVerified,
      coursesOwnedCount: user._count.coursesOwned,
      activeEnrollmentsCount: user._count.enrollments,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    const totalPages = Math.ceil(total / pageSize);

    return {
      users: userItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get paginated list of all courses
   * Requirements: 8.7
   */
  async getCourseList(page: number = 1): Promise<AdminCourseListDto> {
    const pageSize = this.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              modules: true,
              enrollments: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      }),
      this.prisma.course.count(),
    ]);

    const courseItems: AdminCourseItemDto[] = await Promise.all(
      courses.map(async (course) => {
        const completedCount = await this.prisma.enrollment.count({
          where: {
            courseId: course.id,
            status: 'COMPLETED',
          },
        });

        const ownerName = this.formatUserName(
          course.owner.firstName,
          course.owner.lastName,
        );

        return {
          id: course.id,
          title: course.title,
          description: course.description || undefined,
          language: course.language,
          status: course.status,
          ownerId: course.ownerId,
          ownerEmail: course.owner.email,
          ownerName,
          moduleCount: course._count.modules,
          enrollmentCount: course._count.enrollments,
          completedEnrollmentCount: completedCount,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
        };
      }),
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      courses: courseItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get user count grouped by role
   */
  private async getUsersByRole(): Promise<Record<string, number>> {
    const userGroups = await this.prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    const result: Record<string, number> = {};
    for (const group of userGroups) {
      result[group.role] = group._count.role;
    }

    return result;
  }

  /**
   * Get course count grouped by status
   */
  private async getCoursesByStatus(): Promise<Record<string, number>> {
    const courseGroups = await this.prisma.course.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const result: Record<string, number> = {};
    for (const group of courseGroups) {
      result[group.status] = group._count.status;
    }

    return result;
  }

  /**
   * Assign role to a user
   * Requirements: 8.2
   */
  async assignRole(dto: AssignRoleDto): Promise<AssignRoleResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === dto.role) {
      throw new BadRequestException('User already has this role');
    }
    const previousRole = user.role;
    const updatedUser = await this.prisma.user.update({
      where: { id: dto.userId },
      data: { role: dto.role },
    });
    return {
      userId: updatedUser.id,
      email: updatedUser.email,
      previousRole,
      newRole: updatedUser.role,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Bulk enroll users via CSV file
   * Requirements: 8.7, 13.7
   */
  async bulkEnrollViaCsv(
    courseId: string,
    csvContent: string,
  ): Promise<BulkEnrollCsvResultDto> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Cannot enroll in unpublished course');
    }
    const userIdentifiers = this.parseCsvContent(csvContent);
    const result: BulkEnrollCsvResultDto = {
      successCount: 0,
      failureCount: 0,
      totalProcessed: userIdentifiers.length,
      failures: [],
    };
    for (const identifier of userIdentifiers) {
      try {
        const userId = await this.resolveUserIdentifier(identifier);
        if (!userId) {
          result.failureCount++;
          result.failures.push({
            identifier,
            reason: 'User not found',
          });
          continue;
        }
        const existingEnrollment = await this.prisma.enrollment.findFirst({
          where: {
            userId,
            courseId,
            status: EnrollmentStatus.ACTIVE,
          },
        });
        if (existingEnrollment) {
          result.failureCount++;
          result.failures.push({
            identifier,
            reason: 'Already enrolled',
          });
          continue;
        }
        await this.prisma.enrollment.create({
          data: {
            userId,
            courseId,
            status: EnrollmentStatus.ACTIVE,
          },
        });
        result.successCount++;
      } catch (err: unknown) {
        result.failureCount++;
        const reason =
          err instanceof Error ? err.message : 'Unknown error';
        result.failures.push({
          identifier,
          reason: reason || 'Unknown error',
        });
      }
    }
    return result;
  }

  /**
   * Get user activity across all courses
   * Requirements: 8.7
   */
  async getUserActivity(page: number = 1): Promise<UserActivityListDto> {
    const pageSize = this.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;
    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        skip,
        take: pageSize,
        orderBy: { enrolledAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.enrollment.count(),
    ]);
    const activities: UserActivityItemDto[] = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progressPercentage = await this.calculateCourseProgress(
          enrollment.userId,
          enrollment.courseId,
        );
        const quizStats = await this.calculateQuizStats(
          enrollment.userId,
          enrollment.courseId,
        );
        const lastActivity = await this.getLastActivityTimestamp(
          enrollment.userId,
          enrollment.courseId,
        );
        const userName = this.formatUserName(
          enrollment.user.firstName,
          enrollment.user.lastName,
        );
        return {
          userId: enrollment.user.id,
          email: enrollment.user.email,
          name: userName !== 'N/A' ? userName : undefined,
          role: enrollment.user.role,
          courseId: enrollment.course.id,
          courseTitle: enrollment.course.title,
          enrollmentStatus: enrollment.status,
          progressPercentage,
          quizAttempts: quizStats.attempts,
          averageQuizScore: quizStats.averageScore,
          lastActivityAt: lastActivity,
          enrolledAt: enrollment.enrolledAt,
        };
      }),
    );
    const totalPages = Math.ceil(total / pageSize);
    return {
      activities,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Parse CSV content and extract user identifiers
   */
  private parseCsvContent(csvContent: string): string[] {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    const identifiers: string[] = [];
    const startIndex =
      lines[0] &&
      (lines[0].toLowerCase().includes('email') ||
        lines[0].toLowerCase().includes('id'))
        ? 1
        : 0;
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const identifier = line.split(',')[0].trim();
        if (identifier) {
          identifiers.push(identifier);
        }
      }
    }
    return identifiers;
  }

  /**
   * Resolve user identifier (email or UUID) to user ID
   */
  private async resolveUserIdentifier(
    identifier: string,
  ): Promise<string | null> {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      const user = await this.prisma.user.findUnique({
        where: { id: identifier },
      });
      return user ? user.id : null;
    }
    const user = await this.prisma.user.findUnique({
      where: { email: identifier },
    });
    return user ? user.id : null;
  }

  /**
   * Calculate course progress percentage for a user
   */
  private async calculateCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<number> {
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      include: {
        contentItems: {
          where: { mandatory: true },
        },
      },
    });
    const totalMandatoryItems = modules.reduce(
      (sum, module) => sum + module.contentItems.length,
      0,
    );
    if (totalMandatoryItems === 0) {
      return 0;
    }
    const completedItems = await this.prisma.progress.count({
      where: {
        userId,
        contentItem: {
          moduleId: {
            in: modules.map((m) => m.id),
          },
          mandatory: true,
        },
        completed: true,
      },
    });
    return Math.round((completedItems / totalMandatoryItems) * 100 * 100) / 100;
  }

  /**
   * Calculate quiz statistics for a user in a course
   */
  private async calculateQuizStats(
    userId: string,
    courseId: string,
  ): Promise<{ attempts: number; averageScore?: number }> {
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    });
    const moduleIds = modules.map((m) => m.id);
    const quizzes = await this.prisma.contentItem.findMany({
      where: {
        moduleId: { in: moduleIds },
        type: 'QUIZ',
      },
      select: { quiz: { select: { id: true } } },
    });
    const quizIds = quizzes
      .map((q) => q.quiz?.id)
      .filter((id): id is string => id !== undefined);
    if (quizIds.length === 0) {
      return { attempts: 0 };
    }
    const attempts = await (this.prisma as any).quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: quizIds },
      },
      select: { score: true },
    });
    if (attempts.length === 0) {
      return { attempts: 0 };
    }
    const totalScore = attempts.reduce(
      (sum: number, attempt: any) => sum + attempt.score,
      0,
    );
    const averageScore = Math.round((totalScore / attempts.length) * 100) / 100;
    return {
      attempts: attempts.length,
      averageScore,
    };
  }

  /**
   * Get last activity timestamp for a user in a course
   */
  private async getLastActivityTimestamp(
    userId: string,
    courseId: string,
  ): Promise<Date | undefined> {
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    });
    const moduleIds = modules.map((m) => m.id);
    const lastProgress = await this.prisma.progress.findFirst({
      where: {
        userId,
        contentItem: {
          moduleId: { in: moduleIds },
        },
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });
    return lastProgress?.completedAt || undefined;
  }

  /**
   * Format user name from first and last name
   */
  private formatUserName(
    firstName: string | null,
    lastName: string | null,
  ): string {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'N/A';
  }
}
