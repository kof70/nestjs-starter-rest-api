import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';
import { CertificateService } from '../../certificate/services/certificate.service';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CertificateService))
    private readonly certificateService: CertificateService,
  ) {}

  /**
   * Mark content item as completed
   * Requirements: 6.1, 6.2, 6.3
   */
  async markContentCompleted(
    contentItemId: string,
    userId: string,
    timeSpent: number = 0,
  ) {
    // Verify content item exists
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!contentItem) {
      throw new NotFoundException('Content item not found');
    }

    // Verify user is enrolled
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: contentItem.module.courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('User is not enrolled in this course');
    }

    // Create or update progress
    const progress = await this.prisma.progress.upsert({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId,
        },
      },
      update: {
        completed: true,
        timeSpent: {
          increment: timeSpent,
        },
        completedAt: new Date(),
      },
      create: {
        userId,
        contentItemId,
        moduleId: contentItem.moduleId,
        completed: true,
        timeSpent,
        completedAt: new Date(),
      },
    });

    // Check and update module completion
    await this.checkModuleCompletion(contentItem.moduleId, userId);

    // Check and update course completion
    await this.checkCourseCompletion(contentItem.module.courseId, userId);

    return progress;
  }

  /**
   * Get progress for a content item
   * Requirements: 6.4
   */
  async getContentProgress(contentItemId: string, userId: string) {
    // Verify content item exists
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
    });

    if (!contentItem) {
      throw new NotFoundException('Content item not found');
    }

    const progress = await this.prisma.progress.findUnique({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId,
        },
      },
    });

    return progress || {
      userId,
      contentItemId,
      completed: false,
      timeSpent: 0,
      completedAt: null,
    };
  }

  /**
   * Get progress for a module
   * Requirements: 6.2, 6.4
   */
  async getModuleProgress(moduleId: string, userId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        contentItems: true,
      },
    });
    if (!module) {
      throw new NotFoundException('Module not found');
    }
    const mandatoryItems = module.contentItems.filter((item) => item.mandatory);
    const totalMandatory = mandatoryItems.length;
    if (totalMandatory === 0) {
      return {
        moduleId,
        completed: true,
        completionPercentage: 100,
        totalItems: 0,
        completedItems: 0,
      };
    }
    const completedProgress = await this.prisma.progress.count({
      where: {
        userId,
        contentItemId: {
          in: mandatoryItems.map((item) => item.id),
        },
        completed: true,
      },
    });
    const completionPercentage = (completedProgress / totalMandatory) * 100;
    return {
      moduleId,
      completed: completionPercentage === 100,
      completionPercentage,
      totalItems: totalMandatory,
      completedItems: completedProgress,
    };
  }

  /**
   * Get progress for a course
   * Requirements: 6.3, 6.4
   */
  async getCourseProgress(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            contentItems: true,
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    let totalMandatory = 0;
    let completedMandatory = 0;
    for (const module of course.modules) {
      const mandatoryItems = module.contentItems.filter((item) => item.mandatory);
      totalMandatory += mandatoryItems.length;
      const completed = await this.prisma.progress.count({
        where: {
          userId,
          contentItemId: {
            in: mandatoryItems.map((item) => item.id),
          },
          completed: true,
        },
      });
      completedMandatory += completed;
    }
    const completionPercentage = totalMandatory > 0 
      ? (completedMandatory / totalMandatory) * 100 
      : 100;
    return {
      courseId,
      completed: completionPercentage === 100,
      completionPercentage,
      totalItems: totalMandatory,
      completedItems: completedMandatory,
    };
  }

  /**
   * Get progress dashboard for user
   * Requirements: 6.4, 6.6
   */
  async getProgressDashboard(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        userId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                contentItems: true,
              },
            },
          },
        },
      },
    });

    const dashboard = [];

    for (const enrollment of enrollments) {
      const courseProgress = await this.getCourseProgress(
        enrollment.courseId,
        userId,
      );

      // Calculate estimated time remaining
      const totalTimeSpent = await this.prisma.progress.aggregate({
        where: {
          userId,
          contentItem: {
            module: {
              courseId: enrollment.courseId,
            },
          },
        },
        _sum: {
          timeSpent: true,
        },
      });

      const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining(
        courseProgress.completionPercentage,
        totalTimeSpent._sum.timeSpent || 0,
      );

      dashboard.push({
        courseId: enrollment.courseId,
        courseTitle: enrollment.course.title,
        enrolledAt: enrollment.enrolledAt,
        completionPercentage: courseProgress.completionPercentage,
        completed: courseProgress.completed,
        totalItems: courseProgress.totalItems,
        completedItems: courseProgress.completedItems,
        timeSpent: totalTimeSpent._sum.timeSpent || 0,
        estimatedTimeRemaining,
      });
    }

    return dashboard;
  }

  /**
   * Track time spent on content item
   * Requirements: 6.5
   */
  async trackTimeSpent(
    contentItemId: string,
    userId: string,
    timeSpent: number,
  ) {
    // Verify content item exists
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: {
        module: true,
      },
    });

    if (!contentItem) {
      throw new NotFoundException('Content item not found');
    }

    // Verify user is enrolled
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: contentItem.module.courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('User is not enrolled in this course');
    }

    // Update or create progress with time tracking
    const progress = await this.prisma.progress.upsert({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId,
        },
      },
      update: {
        timeSpent: {
          increment: timeSpent,
        },
      },
      create: {
        userId,
        contentItemId,
        moduleId: contentItem.moduleId,
        timeSpent,
        completed: false,
      },
    });

    return progress;
  }

  /**
   * Sync offline progress
   * Requirements: 6.7, 10.5
   */
  async syncOfflineProgress(
    userId: string,
    progressData: Array<{
      contentItemId: string;
      timeSpent: number;
      completed: boolean;
      timestamp: Date;
    }>,
  ) {
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of progressData) {
      try {
        // Verify content item exists and get module info
        const contentItem = await this.prisma.contentItem.findUnique({
          where: { id: item.contentItemId },
          include: {
            module: true,
          },
        });

        if (!contentItem) {
          results.failed++;
          results.errors.push(
            `Content item ${item.contentItemId} not found`,
          );
          continue;
        }

        // Verify enrollment
        const enrollment = await this.prisma.enrollment.findFirst({
          where: {
            userId,
            courseId: contentItem.module.courseId,
            status: EnrollmentStatus.ACTIVE,
          },
        });

        if (!enrollment) {
          results.failed++;
          results.errors.push(
            `User not enrolled in course for content ${item.contentItemId}`,
          );
          continue;
        }

        // Upsert progress
        await this.prisma.progress.upsert({
          where: {
            userId_contentItemId: {
              userId,
              contentItemId: item.contentItemId,
            },
          },
          update: {
            timeSpent: {
              increment: item.timeSpent,
            },
            completed: item.completed,
            completedAt: item.completed ? item.timestamp : null,
          },
          create: {
            userId,
            contentItemId: item.contentItemId,
            moduleId: contentItem.moduleId,
            timeSpent: item.timeSpent,
            completed: item.completed,
            completedAt: item.completed ? item.timestamp : null,
          },
        });

        // Check module and course completion if item was completed
        if (item.completed) {
          await this.checkModuleCompletion(contentItem.moduleId, userId);
          await this.checkCourseCompletion(contentItem.module.courseId, userId);
        }

        results.synced++;
      } catch (error: unknown) {
        results.failed++;
        const msg = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to sync ${item.contentItemId}: ${msg}`);
      }
    }

    return results;
  }

  /**
   * Check and update module completion
   * Requirements: 6.2
   */
  private async checkModuleCompletion(moduleId: string, userId: string) {
    const moduleProgress = await this.getModuleProgress(moduleId, userId);

    if (moduleProgress.completed) {
      // Module is complete, could trigger notifications or other actions
      return true;
    }

    return false;
  }

  /**
   * Check and update course completion
   * Requirements: 6.3, 6.5, 7.1, 7.6
   */
  private async checkCourseCompletion(
    courseId: string,
    userId: string,
  ): Promise<boolean> {
    const courseProgress = await this.getCourseProgress(courseId, userId);
    if (courseProgress.completed) {
      await this.prisma.enrollment.updateMany({
        where: {
          userId,
          courseId,
          status: EnrollmentStatus.ACTIVE,
        },
        data: {
          status: EnrollmentStatus.COMPLETED,
        },
      });
      await this.triggerCertificateGeneration(userId, courseId);
      return true;
    }
    return false;
  }

  /**
   * Trigger certificate generation on course completion
   * Requirements: 7.1, 7.6
   */
  private async triggerCertificateGeneration(
    userId: string,
    courseId: string,
  ): Promise<void> {
    try {
      const canGenerate = await this.certificateService.canGenerateCertificate(
        userId,
        courseId,
      );
      if (canGenerate) {
        await this.certificateService.generateCertificate(userId, courseId);
      }
    } catch (error: unknown) {
      // Log error but don't fail the completion process
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to generate certificate for user ${userId} and course ${courseId}:`,
        msg,
      );
    }
  }

  /**
   * Calculate estimated time remaining
   * Requirements: 6.6
   */
  private calculateEstimatedTimeRemaining(
    completionPercentage: number,
    timeSpent: number,
  ): number {
    if (completionPercentage === 0 || completionPercentage === 100) {
      return 0;
    }

    // Estimate based on current pace
    const totalEstimatedTime = (timeSpent / completionPercentage) * 100;
    const remaining = totalEstimatedTime - timeSpent;

    return Math.max(0, Math.round(remaining));
  }
}
