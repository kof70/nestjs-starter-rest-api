import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import {
  ExportedCourse,
  ExportedModule,
  ExportedContentItem,
  ExportedQuiz,
  ExportedQuestion,
  ExportedQuestionOption,
  ExportedVideo,
  ExportedTab,
} from '../types/export.types';
import { ExportFormat } from '../dtos/export-course.dto';

/**
 * Export service for course backup and migration
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly EXPORT_VERSION = '1.0.0';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export course to JSON or ZIP format
   * Requirements: 16.1, 16.2, 16.3, 16.4
   */
  async exportCourse(
    courseId: string,
    userId: string,
    userRole: UserRole,
    format: ExportFormat = ExportFormat.JSON,
  ): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    // Validate course ownership
    await this.validateCourseOwnership(courseId, userId, userRole);

    // Fetch complete course data
    const exportData = await this.fetchCourseData(courseId);

    // Generate JSON
    const jsonData = JSON.stringify(exportData, null, 2);

    if (format === ExportFormat.JSON) {
      return {
        data: Buffer.from(jsonData, 'utf-8'),
        filename: `course-${courseId}-${Date.now()}.json`,
        mimeType: 'application/json',
      };
    }

    // ZIP format not yet implemented - requires archiver package
    throw new BadRequestException(
      'ZIP export format is not yet implemented. Please use JSON format.',
    );
  }

  /**
   * Validate that user has permission to export course
   * Requirements: 16.1
   */
  private async validateCourseOwnership(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, ownerId: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Admin can export any course, instructors can only export their own
    if (userRole !== UserRole.ADMIN && course.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to export this course',
      );
    }
  }

  /**
   * Fetch complete course data excluding learner data
   * Requirements: 16.2, 16.3, 16.4
   */
  private async fetchCourseData(courseId: string): Promise<ExportedCourse> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            contentItems: {
              orderBy: { order: 'asc' },
              include: {
                quiz: {
                  include: {
                    questions: {
                      orderBy: { order: 'asc' },
                      include: {
                        options: {
                          orderBy: { order: 'asc' },
                        },
                      },
                    },
                  },
                },
                video: true,
              },
            },
            prerequisite: {
              select: { order: true },
            },
          },
        },
        tabs: {
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
    const courseData = course as any;
    const exportedCourse: ExportedCourse = {
      version: this.EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      course: {
        title: courseData.title,
        description: courseData.description,
        language: courseData.language,
        status: courseData.status,
        enrollmentStart: courseData.enrollmentStart?.toISOString() || null,
        enrollmentEnd: courseData.enrollmentEnd?.toISOString() || null,
        courseStart: courseData.courseStart?.toISOString() || null,
        courseEnd: courseData.courseEnd?.toISOString() || null,
      },
      modules: courseData.modules.map((module: any) => this.exportModule(module)),
      tabs: courseData.tabs.map((tab: any) => this.exportTab(tab)),
    };
    return exportedCourse;
  }

  /**
   * Export module data
   * Requirements: 16.2
   */
  private exportModule(module: {
    title: string;
    description: string | null;
    order: number;
    prerequisite: { order: number } | null;
    contentItems: Array<{
      title: string;
      type: string;
      order: number;
      mandatory: boolean;
      textContent: string | null;
      videoUrl: string | null;
      videoEmbedCode: string | null;
      documentUrl: string | null;
      quiz: {
        passingScore: number;
        maxAttempts: number;
        questions: Array<{
          questionText: string;
          order: number;
          options: Array<{
            optionText: string;
            isCorrect: boolean;
            order: number;
          }>;
        }>;
      } | null;
      video: {
        title: string;
        description: string | null;
        duration: number | null;
        format: string | null;
        thumbnailUrl: string | null;
        youtubeUrl: string | null;
      } | null;
    }>;
  }): ExportedModule {
    return {
      title: module.title,
      description: module.description,
      order: module.order,
      prerequisiteOrder: module.prerequisite?.order || null,
      contentItems: module.contentItems.map((item) =>
        this.exportContentItem(item),
      ),
    };
  }

  /**
   * Export content item data
   * Requirements: 16.2
   */
  private exportContentItem(item: {
    title: string;
    type: string;
    order: number;
    mandatory: boolean;
    textContent: string | null;
    videoUrl: string | null;
    videoEmbedCode: string | null;
    documentUrl: string | null;
    quiz: {
      passingScore: number;
      maxAttempts: number;
      questions: Array<{
        questionText: string;
        order: number;
        options: Array<{
          optionText: string;
          isCorrect: boolean;
          order: number;
        }>;
      }>;
    } | null;
    video: {
      title: string;
      description: string | null;
      duration: number | null;
      format: string | null;
      thumbnailUrl: string | null;
      youtubeUrl: string | null;
    } | null;
  }): ExportedContentItem {
    return {
      title: item.title,
      type: item.type as any,
      order: item.order,
      mandatory: item.mandatory,
      textContent: item.textContent,
      videoUrl: item.videoUrl,
      videoEmbedCode: item.videoEmbedCode,
      documentUrl: item.documentUrl,
      quiz: item.quiz ? this.exportQuiz(item.quiz) : null,
      video: item.video ? this.exportVideo(item.video) : null,
    };
  }

  /**
   * Export quiz data
   * Requirements: 16.2
   */
  private exportQuiz(quiz: {
    passingScore: number;
    maxAttempts: number;
    questions: Array<{
      questionText: string;
      order: number;
      options: Array<{
        optionText: string;
        isCorrect: boolean;
        order: number;
      }>;
    }>;
  }): ExportedQuiz {
    return {
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      questions: quiz.questions.map((q) => this.exportQuestion(q)),
    };
  }

  /**
   * Export question data
   * Requirements: 16.2
   */
  private exportQuestion(question: {
    questionText: string;
    order: number;
    options: Array<{
      optionText: string;
      isCorrect: boolean;
      order: number;
    }>;
  }): ExportedQuestion {
    return {
      questionText: question.questionText,
      order: question.order,
      options: question.options.map((opt) => this.exportQuestionOption(opt)),
    };
  }

  /**
   * Export question option data
   * Requirements: 16.2
   */
  private exportQuestionOption(option: {
    optionText: string;
    isCorrect: boolean;
    order: number;
  }): ExportedQuestionOption {
    return {
      optionText: option.optionText,
      isCorrect: option.isCorrect,
      order: option.order,
    };
  }

  /**
   * Export video data
   * Requirements: 16.2
   */
  private exportVideo(video: {
    title: string;
    description: string | null;
    duration: number | null;
    format: string | null;
    thumbnailUrl: string | null;
    youtubeUrl: string | null;
  }): ExportedVideo {
    return {
      title: video.title,
      description: video.description,
      duration: video.duration,
      format: video.format,
      thumbnailUrl: video.thumbnailUrl,
      youtubeUrl: video.youtubeUrl,
    };
  }

  /**
   * Export tab data
   * Requirements: 16.2
   */
  private exportTab(tab: {
    title: string;
    type: string;
    order: number;
    visible: boolean;
    content: string | null;
    externalUrl: string | null;
  }): ExportedTab {
    return {
      title: tab.title,
      type: tab.type as any,
      order: tab.order,
      visible: tab.visible,
      content: tab.content,
      externalUrl: tab.externalUrl,
    };
  }
}
