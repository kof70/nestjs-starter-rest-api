import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';
import { LmsEnrolledCourseResponseDto } from '../dtos/lms-enrolled-course-response.dto';
import { LmsModuleNavigationResponseDto } from '../dtos/lms-module-navigation-response.dto';
import { LmsContentItemResponseDto } from '../dtos/lms-content-item-response.dto';

/**
 * Service for LMS learner navigation
 * Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 5.10
 */
@Injectable()
export class LmsNavigationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all enrolled courses for a learner
   * Requirements: 5.2, 5.10
   */
  async getEnrolledCourses(
    userId: string,
  ): Promise<LmsEnrolledCourseResponseDto[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        userId,
        status: {
          in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            language: true,
            courseStart: true,
            courseEnd: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const enrolledCourses: LmsEnrolledCourseResponseDto[] = [];

    for (const enrollment of enrollments) {
      const progress = await this.calculateCourseProgress(
        enrollment.courseId,
        userId,
      );

      enrolledCourses.push({
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description ?? '',
        language: enrollment.course.language,
        startDate: enrollment.course.courseStart,
        endDate: enrollment.course.courseEnd,
        enrollmentStatus: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        progressPercentage: progress.completionPercentage,
        completed: progress.completed,
      });
    }

    return enrolledCourses;
  }

  /**
   * Get modules for a course with prerequisite locking
   * Requirements: 5.3, 5.7
   */
  async getCourseModules(
    courseId: string,
    userId: string,
  ): Promise<LmsModuleNavigationResponseDto[]> {
    await this.validateEnrollment(courseId, userId);

    const modules = await this.prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });

    const moduleResponses: LmsModuleNavigationResponseDto[] = [];

    for (const module of modules) {
      const progress = await this.calculateModuleProgress(module.id, userId);
      const isLocked = await this.isModuleLocked(module, userId);

      moduleResponses.push({
        id: module.id,
        title: module.title,
        description: module.description || undefined,
        order: module.order,
        prerequisiteId: module.prerequisiteId,
        locked: isLocked,
        progressPercentage: progress.completionPercentage,
        completed: progress.completed,
        totalItems: progress.totalItems,
        completedItems: progress.completedItems,
      });
    }

    return moduleResponses;
  }

  /**
   * Get content items for a module with progress tracking
   * Requirements: 5.4, 6.1
   */
  async getModuleContent(
    courseId: string,
    moduleId: string,
    userId: string,
  ): Promise<LmsContentItemResponseDto[]> {
    await this.validateEnrollment(courseId, userId);

    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        contentItems: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    if (module.courseId !== courseId) {
      throw new BadRequestException('Module does not belong to this course');
    }

    const contentResponses: LmsContentItemResponseDto[] = [];

    for (const contentItem of module.contentItems) {
      const progress = await this.prisma.progress.findUnique({
        where: {
          userId_contentItemId: {
            userId,
            contentItemId: contentItem.id,
          },
        },
      });

      contentResponses.push({
        id: contentItem.id,
        title: contentItem.title,
        type: contentItem.type,
        order: contentItem.order,
        mandatory: contentItem.mandatory,
        textContent: contentItem.textContent || undefined,
        videoUrl: contentItem.videoUrl || undefined,
        videoEmbedCode: contentItem.videoEmbedCode || undefined,
        documentUrl: contentItem.documentUrl || undefined,
        completed: progress?.completed || false,
        timeSpent: progress?.timeSpent || 0,
        completedAt: progress?.completedAt || null,
      });
    }

    return contentResponses;
  }

  /**
   * Validate that user is enrolled in course
   * Requirements: 5.2
   */
  private async validateEnrollment(
    courseId: string,
    userId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('User is not enrolled in this course');
    }
  }

  /**
   * Check if module is locked due to prerequisites
   * Requirements: 5.7
   */
  private async isModuleLocked(
    module: { id: string; prerequisiteId: string | null },
    userId: string,
  ): Promise<boolean> {
    if (!module.prerequisiteId) {
      return false;
    }

    const prerequisiteProgress = await this.calculateModuleProgress(
      module.prerequisiteId,
      userId,
    );

    return !prerequisiteProgress.completed;
  }

  /**
   * Calculate module progress
   * Requirements: 6.2
   */
  private async calculateModuleProgress(
    moduleId: string,
    userId: string,
  ): Promise<{
    completed: boolean;
    completionPercentage: number;
    totalItems: number;
    completedItems: number;
  }> {
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
      completed: completionPercentage === 100,
      completionPercentage,
      totalItems: totalMandatory,
      completedItems: completedProgress,
    };
  }

  /**
   * Calculate course progress
   * Requirements: 6.3
   */
  private async calculateCourseProgress(
    courseId: string,
    userId: string,
  ): Promise<{
    completed: boolean;
    completionPercentage: number;
  }> {
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
      const mandatoryItems = module.contentItems.filter(
        (item) => item.mandatory,
      );
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

    const completionPercentage =
      totalMandatory > 0 ? (completedMandatory / totalMandatory) * 100 : 100;

    return {
      completed: completionPercentage === 100,
      completionPercentage,
    };
  }
}
