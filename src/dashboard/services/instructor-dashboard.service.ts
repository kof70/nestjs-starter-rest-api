import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { EnrollmentStatisticsDto } from '../dtos/enrollment-statistics.dto';
import {
  LearnerProgressSummaryDto,
  LearnerProgressItemDto,
} from '../dtos/learner-progress-summary.dto';
import {
  QuizPerformanceDto,
  LearnerQuizPerformanceDto,
} from '../dtos/quiz-performance.dto';
import {
  AverageTimePerModuleDto,
  ModuleTimeStatisticsDto,
} from '../dtos/average-time-per-module.dto';
import {
  FilteredLearnersDto,
  FilteredLearnerItemDto,
  ProgressStatusFilter,
} from '../dtos/filtered-learners.dto';
import {
  StrugglingLearnersDto,
  StrugglingLearnerItemDto,
} from '../dtos/struggling-learner.dto';
import { BulkEmailDto, BulkEmailResponseDto } from '../dtos/bulk-email.dto';
import { NotificationService } from '../../notification/services/notification.service';

/**
 * Service for instructor dashboard analytics and statistics
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8
 */
@Injectable()
export class InstructorDashboardService {
  private readonly LOW_QUIZ_SCORE_THRESHOLD = 60;
  private readonly INACTIVITY_DAYS_THRESHOLD = 7;
  private readonly LOW_COMPLETION_THRESHOLD = 25;
  private readonly LOW_COMPLETION_DAYS_THRESHOLD = 14;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get enrollment statistics for a course
   * Requirements: 14.1
   */
  async getEnrollmentStatistics(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<EnrollmentStatisticsDto> {
    await this.validateCourseAccess(courseId, userId, userRole);
    const enrollments = await this.findCourseEnrollments(courseId);
    return this.calculateEnrollmentStatistics(courseId, enrollments);
  }

  /**
   * Get learner progress summary for a course
   * Requirements: 14.2
   */
  async getLearnerProgressSummary(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<LearnerProgressSummaryDto> {
    await this.validateCourseAccess(courseId, userId, userRole);
    const course = await this.findCourseWithModules(courseId);
    const enrollments = await this.findActiveEnrollments(courseId);
    const learners = await this.buildLearnerProgressItems(course, enrollments);
    return {
      courseId,
      learners,
      totalLearners: learners.length,
    };
  }

  /**
   * Get quiz performance data for all learners in a course
   * Requirements: 14.3
   */
  async getQuizPerformance(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<QuizPerformanceDto> {
    await this.validateCourseAccess(courseId, userId, userRole);
    const quizzes = await this.findCourseQuizzes(courseId);
    const learnerPerformance = await this.buildQuizPerformanceData(quizzes);
    const statistics = this.calculateQuizStatistics(learnerPerformance);
    return {
      courseId,
      learnerPerformance,
      averageScore: statistics.averageScore,
      totalAttempts: statistics.totalAttempts,
    };
  }

  /**
   * Calculate average time spent per module
   * Requirements: 14.6
   */
  async getAverageTimePerModule(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<AverageTimePerModuleDto> {
    await this.validateCourseAccess(courseId, userId, userRole);
    const modules = await this.findCourseModules(courseId);
    const moduleStats = await this.calculateModuleTimeStatistics(modules);
    const overallAverage = this.calculateOverallAverageTime(moduleStats);
    return {
      courseId,
      modules: moduleStats,
      overallAverageTime: overallAverage,
    };
  }

  private async validateCourseAccess(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (userRole !== UserRole.ADMIN && course.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view analytics for this course',
      );
    }
  }



  private async findCourseWithModules(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            contentItems: {
              where: { mandatory: true },
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  private async findActiveEnrollments(courseId: string) {
    return this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: 'ACTIVE',
      },
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
    });
  }

  private async buildLearnerProgressItems(
    course: any,
    enrollments: any[],
  ): Promise<LearnerProgressItemDto[]> {
    const learners: LearnerProgressItemDto[] = [];
    for (const enrollment of enrollments) {
      const progressData = await this.calculateLearnerProgress(
        course,
        enrollment.userId,
      );
      const lastActivity = await this.findLastActivity(enrollment.userId);
      learners.push({
        userId: enrollment.user.id,
        email: enrollment.user.email,
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        completionPercentage: progressData.completionPercentage,
        totalItems: progressData.totalItems,
        completedItems: progressData.completedItems,
        enrolledAt: enrollment.enrolledAt,
        lastActivityAt: lastActivity,
      });
    }
    return learners;
  }

  private async calculateLearnerProgress(course: any, userId: string) {
    let totalMandatory = 0;
    let completedMandatory = 0;
    for (const module of course.modules) {
      totalMandatory += module.contentItems.length;
      const completed = await (this.prisma as any).progress.count({
        where: {
          userId,
          contentItemId: {
            in: module.contentItems.map((item: any) => item.id),
          },
          completed: true,
        },
      });
      completedMandatory += completed;
    }
    const completionPercentage =
      totalMandatory > 0 ? (completedMandatory / totalMandatory) * 100 : 0;
    return {
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      totalItems: totalMandatory,
      completedItems: completedMandatory,
    };
  }

  private async findLastActivity(userId: string): Promise<Date | undefined> {
    const lastProgress = await (this.prisma as any).progress.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    return lastProgress?.updatedAt;
  }

  private async findCourseQuizzes(courseId: string) {
    return (this.prisma as any).quiz.findMany({
      where: {
        contentItem: {
          module: {
            courseId,
          },
        },
      },
      include: {
        contentItem: {
          select: {
            id: true,
            title: true,
          },
        },
        attempts: {
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
          orderBy: {
            completedAt: 'desc',
          },
        },
      },
    });
  }

  private async buildQuizPerformanceData(
    quizzes: any[],
  ): Promise<LearnerQuizPerformanceDto[]> {
    const learnerMap = new Map<string, Map<string, any>>();
    for (const quiz of quizzes) {
      for (const attempt of quiz.attempts) {
        if (!learnerMap.has(attempt.userId)) {
          learnerMap.set(attempt.userId, new Map());
        }
        const userQuizzes = learnerMap.get(attempt.userId)!;
        if (!userQuizzes.has(quiz.id)) {
          userQuizzes.set(quiz.id, {
            quizId: quiz.id,
            quizTitle: quiz.contentItem.title,
            attempts: [],
            user: attempt.user,
          });
        }
        userQuizzes.get(quiz.id)!.attempts.push(attempt);
      }
    }
    return this.mapLearnerQuizPerformance(learnerMap);
  }

  private mapLearnerQuizPerformance(
    learnerMap: Map<string, Map<string, any>>,
  ): LearnerQuizPerformanceDto[] {
    const performance: LearnerQuizPerformanceDto[] = [];
    for (const [userId, quizzes] of learnerMap.entries()) {
      for (const quizData of quizzes.values()) {
        const attempts = quizData.attempts.map((attempt: any) => ({
          attemptId: attempt.id,
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          completedAt: attempt.completedAt,
        }));
        const bestScore = Math.max(...attempts.map((a: any) => a.score));
        performance.push({
          userId,
          email: quizData.user.email,
          firstName: quizData.user.firstName,
          lastName: quizData.user.lastName,
          quizId: quizData.quizId,
          quizTitle: quizData.quizTitle,
          bestScore,
          attemptCount: attempts.length,
          attempts,
        });
      }
    }
    return performance;
  }

  private calculateQuizStatistics(performance: LearnerQuizPerformanceDto[]) {
    const totalAttempts = performance.reduce((sum, p) => sum + p.attemptCount, 0);
    const totalScore = performance.reduce((sum, p) => sum + p.bestScore, 0);
    const averageScore = performance.length > 0 ? totalScore / performance.length : 0;
    return {
      averageScore: Math.round(averageScore * 100) / 100,
      totalAttempts,
    };
  }

  private async findCourseModules(courseId: string) {
    return this.prisma.module.findMany({
      where: { courseId },
      include: {
        contentItems: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  private async calculateModuleTimeStatistics(
    modules: any[],
  ): Promise<ModuleTimeStatisticsDto[]> {
    const stats: ModuleTimeStatisticsDto[] = [];
    for (const module of modules) {
      const contentItemIds = module.contentItems.map((item: any) => item.id);
      if (contentItemIds.length === 0) {
        continue;
      }
      const progressData = await (this.prisma as any).progress.groupBy({
        by: ['userId'],
        where: {
          contentItemId: { in: contentItemIds },
        },
        _sum: {
          timeSpent: true,
        },
      });
      const totalTimeSpent = progressData.reduce(
        (sum: number, p: any) => sum + (p._sum.timeSpent || 0),
        0,
      );
      const learnerCount = progressData.length;
      const averageTimeSpent = learnerCount > 0 ? totalTimeSpent / learnerCount : 0;
      stats.push({
        moduleId: module.id,
        moduleTitle: module.title,
        averageTimeSpent: Math.round(averageTimeSpent),
        learnerCount,
        totalTimeSpent,
      });
    }
    return stats;
  }

  private calculateOverallAverageTime(stats: ModuleTimeStatisticsDto[]): number {
    if (stats.length === 0) {
      return 0;
    }
    const totalAverage = stats.reduce((sum, s) => sum + s.averageTimeSpent, 0);
    return Math.round(totalAverage / stats.length);
  }

  /**
   * Get filtered learners by progress status
   * Requirements: 14.4
   */
  async getFilteredLearners(
    courseId: string,
    userId: string,
    userRole: UserRole,
    filter: ProgressStatusFilter,
  ): Promise<FilteredLearnersDto> {
    await this.validateCourseAccess(courseId, userId, userRole);
    const course = await this.findCourseWithModules(courseId);
    const enrollments = await this.findActiveEnrollments(courseId);
    const learners = await this.buildFilteredLearnerItems(course, enrollments, filter);
    return {
      courseId,
      filterStatus: filter,
      learners,
      totalCount: learners.length,
    };
  }

  /**
   * Get struggling learners
   * Requirements: 14.7
   */
  async getStrugglingLearners(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<StrugglingLearnersDto> {
    await this.validateCourseAccess(courseId, userId, userRole);
    const course = await this.findCourseWithModules(courseId);
    const enrollments = await this.findActiveEnrollments(courseId);
    const strugglingLearners = await this.identifyStrugglingLearners(course, enrollments);
    return {
      courseId,
      learners: strugglingLearners,
      totalCount: strugglingLearners.length,
      criteria: {
        lowQuizScoreThreshold: this.LOW_QUIZ_SCORE_THRESHOLD,
        inactivityDaysThreshold: this.INACTIVITY_DAYS_THRESHOLD,
        lowCompletionThreshold: this.LOW_COMPLETION_THRESHOLD,
        lowCompletionDaysThreshold: this.LOW_COMPLETION_DAYS_THRESHOLD,
      },
    };
  }

  /**
   * Export learners to CSV
   * Requirements: 14.5
   */
  async exportLearnersToCSV(
    courseId: string,
    userId: string,
    userRole: UserRole,
    filter?: ProgressStatusFilter,
  ): Promise<string> {
    await this.validateCourseAccess(courseId, userId, userRole);
    const course = await this.findCourseWithModules(courseId);
    const enrollments = await this.findActiveEnrollments(courseId);
    const learners = await this.buildFilteredLearnerItems(
      course,
      enrollments,
      filter || ProgressStatusFilter.ALL,
    );
    return this.generateCSV(learners);
  }

  /**
   * Send bulk email to enrolled learners
   * Requirements: 14.8
   */
  async sendBulkEmail(
    courseId: string,
    userId: string,
    userRole: UserRole,
    dto: BulkEmailDto,
  ): Promise<BulkEmailResponseDto> {
    await this.validateCourseAccess(courseId, userId, userRole);
    const recipientIds = await this.determineRecipients(courseId, dto);
    await this.notificationService.sendBulkEmail(
      recipientIds,
      dto.subject,
      dto.content,
    );
    return {
      courseId,
      recipientCount: recipientIds.length,
      subject: dto.subject,
      message: `Bulk email queued for ${recipientIds.length} recipients`,
      queuedAt: new Date(),
    };
  }

  private async buildFilteredLearnerItems(
    course: any,
    enrollments: any[],
    filter: ProgressStatusFilter,
  ): Promise<FilteredLearnerItemDto[]> {
    const learners: FilteredLearnerItemDto[] = [];
    for (const enrollment of enrollments) {
      const progressData = await this.calculateLearnerProgress(course, enrollment.userId);
      const lastActivity = await this.findLastActivity(enrollment.userId);
      const averageQuizScore = await this.calculateAverageQuizScore(course.id, enrollment.userId);
      const status = this.determineProgressStatus(progressData.completionPercentage);
      if (filter !== ProgressStatusFilter.ALL && status !== filter) {
        continue;
      }
      learners.push({
        userId: enrollment.user.id,
        email: enrollment.user.email,
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        completionPercentage: progressData.completionPercentage,
        enrolledAt: enrollment.enrolledAt,
        lastActivityAt: lastActivity,
        averageQuizScore,
        status,
      });
    }
    return learners;
  }

  private determineProgressStatus(completionPercentage: number): string {
    if (completionPercentage === 0) {
      return ProgressStatusFilter.NOT_STARTED;
    }
    if (completionPercentage === 100) {
      return ProgressStatusFilter.COMPLETED;
    }
    return ProgressStatusFilter.IN_PROGRESS;
  }

  private async calculateAverageQuizScore(
    courseId: string,
    userId: string,
  ): Promise<number | undefined> {
    const quizzes = await (this.prisma as any).quiz.findMany({
      where: {
        contentItem: {
          module: {
            courseId,
          },
        },
      },
      include: {
        attempts: {
          where: {
            userId,
          },
        },
      },
    });
    const bestScores = quizzes
      .map((quiz: any) => {
        if (quiz.attempts.length === 0) {
          return null;
        }
        return Math.max(...quiz.attempts.map((attempt: any) => attempt.score));
      })
      .filter((score: number | null) => score !== null) as number[];
    if (bestScores.length === 0) {
      return undefined;
    }
    const average = bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length;
    return Math.round(average * 100) / 100;
  }

  private async identifyStrugglingLearners(
    course: any,
    enrollments: any[],
  ): Promise<StrugglingLearnerItemDto[]> {
    const strugglingLearners: StrugglingLearnerItemDto[] = [];
    const now = new Date();
    for (const enrollment of enrollments) {
      const progressData = await this.calculateLearnerProgress(course, enrollment.userId);
      const lastActivity = await this.findLastActivity(enrollment.userId);
      const averageQuizScore = await this.calculateAverageQuizScore(course.id, enrollment.userId);
      const daysSinceEnrollment = this.calculateDaysDifference(enrollment.enrolledAt, now);
      const daysSinceLastActivity = lastActivity
        ? this.calculateDaysDifference(lastActivity, now)
        : daysSinceEnrollment;
      const strugglingReasons = this.determineStrugglingReasons(
        averageQuizScore,
        daysSinceLastActivity,
        progressData.completionPercentage,
        daysSinceEnrollment,
      );
      if (strugglingReasons.length > 0) {
        strugglingLearners.push({
          userId: enrollment.user.id,
          email: enrollment.user.email,
          firstName: enrollment.user.firstName,
          lastName: enrollment.user.lastName,
          completionPercentage: progressData.completionPercentage,
          averageQuizScore,
          daysSinceLastActivity,
          daysSinceEnrollment,
          enrolledAt: enrollment.enrolledAt,
          lastActivityAt: lastActivity,
          strugglingReasons,
        });
      }
    }
    return strugglingLearners;
  }

  private determineStrugglingReasons(
    averageQuizScore: number | undefined,
    daysSinceLastActivity: number,
    completionPercentage: number,
    daysSinceEnrollment: number,
  ): string[] {
    const reasons: string[] = [];
    if (averageQuizScore !== undefined && averageQuizScore < this.LOW_QUIZ_SCORE_THRESHOLD) {
      reasons.push(`Low quiz score: ${averageQuizScore}% (threshold: ${this.LOW_QUIZ_SCORE_THRESHOLD}%)`);
    }
    if (daysSinceLastActivity >= this.INACTIVITY_DAYS_THRESHOLD) {
      reasons.push(`No activity for ${daysSinceLastActivity} days (threshold: ${this.INACTIVITY_DAYS_THRESHOLD} days)`);
    }
    if (
      daysSinceEnrollment >= this.LOW_COMPLETION_DAYS_THRESHOLD &&
      completionPercentage < this.LOW_COMPLETION_THRESHOLD
    ) {
      reasons.push(
        `Low completion: ${completionPercentage}% after ${daysSinceEnrollment} days (threshold: ${this.LOW_COMPLETION_THRESHOLD}% after ${this.LOW_COMPLETION_DAYS_THRESHOLD} days)`,
      );
    }
    return reasons;
  }

  private calculateDaysDifference(startDate: Date, endDate: Date): number {
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private generateCSV(learners: FilteredLearnerItemDto[]): string {
    const headers = [
      'Name',
      'Email',
      'Enrollment Date',
      'Completion Percentage',
      'Average Quiz Score',
      'Last Activity Date',
      'Status',
    ];
    const rows = learners.map((learner) => {
      const name = `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || 'N/A';
      const enrollmentDate = learner.enrolledAt.toISOString().split('T')[0];
      const lastActivityDate = learner.lastActivityAt
        ? learner.lastActivityAt.toISOString().split('T')[0]
        : 'N/A';
      const quizScore = learner.averageQuizScore !== undefined
        ? `${learner.averageQuizScore}%`
        : 'N/A';
      return [
        name,
        learner.email,
        enrollmentDate,
        `${learner.completionPercentage}%`,
        quizScore,
        lastActivityDate,
        learner.status,
      ];
    });
    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => `"${cell}"`).join(','),
    );
    return csvLines.join('\n');
  }

  private async determineRecipients(
    courseId: string,
    dto: BulkEmailDto,
  ): Promise<string[]> {
    if (dto.recipientUserIds && dto.recipientUserIds.length > 0) {
      return dto.recipientUserIds;
    }
    const enrollments = await this.findActiveEnrollments(courseId);
    if (!dto.filterByStatus || dto.filterByStatus === ProgressStatusFilter.ALL) {
      return enrollments.map((e) => e.userId);
    }
    const course = await this.findCourseWithModules(courseId);
    const filteredLearners = await this.buildFilteredLearnerItems(
      course,
      enrollments,
      dto.filterByStatus,
    );
    return filteredLearners.map((l) => l.userId);
  }

  private async findCourseEnrollments(courseId: string) {
    return this.prisma.enrollment.findMany({
      where: { courseId },
    });
  }

  private calculateEnrollmentStatistics(
    courseId: string,
    enrollments: any[],
  ): EnrollmentStatisticsDto {
    const totalEnrolled = enrollments.length;
    const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE').length;
    const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const inactiveEnrollments = enrollments.filter((e) => e.status === 'INACTIVE').length;
    const completionRate =
      totalEnrolled > 0 ? (completedEnrollments / totalEnrolled) * 100 : 0;
    return {
      courseId,
      totalEnrolled,
      activeEnrollments,
      completedEnrollments,
      inactiveEnrollments,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }
}
