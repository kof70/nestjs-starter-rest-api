import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  ExportedCourse,
  ExportedModule,
  ExportedContentItem,
  ExportedQuiz,
  ExportedQuestion,
  ExportedTab,
} from '../types/export.types';
import {
  ImportResult,
  ImportError,
  ImportWarning,
} from '../dtos/import-course.dto';
import { ContentType, TabType, Language, CourseStatus } from '@prisma/client';

/**
 * Import service for course restoration and migration
 * Requirements: 16.5, 16.6, 16.7, 16.8
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly SUPPORTED_VERSIONS = ['1.0.0'];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import course from JSON data
   * Requirements: 16.5, 16.6, 16.7, 16.8
   */
  async importCourse(
    jsonData: string,
    userId: string,
  ): Promise<ImportResult> {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    try {
      // Parse JSON
      let exportedCourse: ExportedCourse;
      try {
        exportedCourse = JSON.parse(jsonData);
      } catch (error) {
        errors.push({
          field: 'data',
          message: 'Invalid JSON format',
          code: 'INVALID_JSON',
        });
        return { success: false, errors, warnings };
      }

      // Validate file structure
      const validationResult = this.validateFileStructure(exportedCourse);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      // Create new course with unique identifiers
      const courseId = await this.createCourseFromExport(
        exportedCourse,
        userId,
      );

      this.logger.log(`Successfully imported course with ID: ${courseId}`);

      return {
        success: true,
        courseId,
        errors,
        warnings,
      };
    } catch (error: unknown) {
      this.logger.error('Import failed', error);
      const msg =
        error instanceof Error ? error.message : 'Import failed due to unexpected error';
      errors.push({
        field: 'general',
        message: msg,
        code: 'IMPORT_FAILED',
      });
      return { success: false, errors, warnings };
    }
  }

  /**
   * Validate file structure before processing
   * Requirements: 16.6
   */
  private validateFileStructure(
    data: any,
  ): { errors: ImportError[]; warnings: ImportWarning[] } {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Check version
    if (!data.version) {
      errors.push({
        field: 'version',
        message: 'Missing version field',
        code: 'MISSING_VERSION',
      });
    } else if (!this.SUPPORTED_VERSIONS.includes(data.version)) {
      errors.push({
        field: 'version',
        message: `Unsupported version: ${data.version}. Supported versions: ${this.SUPPORTED_VERSIONS.join(', ')}`,
        code: 'UNSUPPORTED_VERSION',
      });
    }

    // Check exportedAt
    if (!data.exportedAt) {
      warnings.push({
        field: 'exportedAt',
        message: 'Missing exportedAt field',
        code: 'MISSING_EXPORTED_AT',
      });
    }

    // Check course metadata
    if (!data.course) {
      errors.push({
        field: 'course',
        message: 'Missing course metadata',
        code: 'MISSING_COURSE',
      });
      return { errors, warnings };
    }

    const course = data.course;

    // Validate required course fields
    if (!course.title || typeof course.title !== 'string') {
      errors.push({
        field: 'course.title',
        message: 'Missing or invalid course title',
        code: 'INVALID_COURSE_TITLE',
      });
    }

    if (!course.language || !['FR', 'EN'].includes(course.language)) {
      errors.push({
        field: 'course.language',
        message: 'Missing or invalid course language (must be FR or EN)',
        code: 'INVALID_LANGUAGE',
      });
    }

    if (
      !course.status ||
      !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(course.status)
    ) {
      errors.push({
        field: 'course.status',
        message: 'Missing or invalid course status',
        code: 'INVALID_STATUS',
      });
    }

    // Check modules
    if (!Array.isArray(data.modules)) {
      errors.push({
        field: 'modules',
        message: 'Missing or invalid modules array',
        code: 'INVALID_MODULES',
      });
    } else {
      // Validate each module
      data.modules.forEach((module: any, index: number) => {
        this.validateModule(module, index, errors, warnings);
      });
    }

    // Check tabs
    if (!Array.isArray(data.tabs)) {
      warnings.push({
        field: 'tabs',
        message: 'Missing tabs array, will use defaults',
        code: 'MISSING_TABS',
      });
    } else {
      data.tabs.forEach((tab: any, index: number) => {
        this.validateTab(tab, index, errors, warnings);
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate module structure
   * Requirements: 16.6
   */
  private validateModule(
    module: any,
    index: number,
    errors: ImportError[],
    warnings: ImportWarning[],
  ): void {
    const prefix = `modules[${index}]`;

    if (!module.title || typeof module.title !== 'string') {
      errors.push({
        field: `${prefix}.title`,
        message: 'Missing or invalid module title',
        code: 'INVALID_MODULE_TITLE',
      });
    }

    if (typeof module.order !== 'number') {
      errors.push({
        field: `${prefix}.order`,
        message: 'Missing or invalid module order',
        code: 'INVALID_MODULE_ORDER',
      });
    }

    if (!Array.isArray(module.contentItems)) {
      errors.push({
        field: `${prefix}.contentItems`,
        message: 'Missing or invalid contentItems array',
        code: 'INVALID_CONTENT_ITEMS',
      });
    } else {
      module.contentItems.forEach((item: any, itemIndex: number) => {
        this.validateContentItem(item, index, itemIndex, errors, warnings);
      });
    }
  }

  /**
   * Validate content item structure
   * Requirements: 16.6
   */
  private validateContentItem(
    item: any,
    moduleIndex: number,
    itemIndex: number,
    errors: ImportError[],
    warnings: ImportWarning[],
  ): void {
    const prefix = `modules[${moduleIndex}].contentItems[${itemIndex}]`;

    if (!item.title || typeof item.title !== 'string') {
      errors.push({
        field: `${prefix}.title`,
        message: 'Missing or invalid content item title',
        code: 'INVALID_ITEM_TITLE',
      });
    }

    if (
      !item.type ||
      !['TEXT', 'VIDEO', 'DOCUMENT', 'QUIZ'].includes(item.type)
    ) {
      errors.push({
        field: `${prefix}.type`,
        message: 'Missing or invalid content type',
        code: 'INVALID_CONTENT_TYPE',
      });
    }

    if (typeof item.order !== 'number') {
      errors.push({
        field: `${prefix}.order`,
        message: 'Missing or invalid content item order',
        code: 'INVALID_ITEM_ORDER',
      });
    }

    // Validate quiz if present
    if (item.type === 'QUIZ' && item.quiz) {
      this.validateQuiz(item.quiz, moduleIndex, itemIndex, errors, warnings);
    }
  }

  /**
   * Validate quiz structure
   * Requirements: 16.6
   */
  private validateQuiz(
    quiz: any,
    moduleIndex: number,
    itemIndex: number,
    errors: ImportError[],
    warnings: ImportWarning[],
  ): void {
    const prefix = `modules[${moduleIndex}].contentItems[${itemIndex}].quiz`;

    if (typeof quiz.passingScore !== 'number' || quiz.passingScore < 0 || quiz.passingScore > 100) {
      errors.push({
        field: `${prefix}.passingScore`,
        message: 'Invalid passing score (must be between 0 and 100)',
        code: 'INVALID_PASSING_SCORE',
      });
    }

    if (typeof quiz.maxAttempts !== 'number' || quiz.maxAttempts < 1) {
      errors.push({
        field: `${prefix}.maxAttempts`,
        message: 'Invalid max attempts (must be at least 1)',
        code: 'INVALID_MAX_ATTEMPTS',
      });
    }

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      errors.push({
        field: `${prefix}.questions`,
        message: 'Quiz must have at least one question',
        code: 'MISSING_QUESTIONS',
      });
    } else {
      quiz.questions.forEach((question: any, qIndex: number) => {
        this.validateQuestion(
          question,
          moduleIndex,
          itemIndex,
          qIndex,
          errors,
          warnings,
        );
      });
    }
  }

  /**
   * Validate question structure
   * Requirements: 16.6
   */
  private validateQuestion(
    question: any,
    moduleIndex: number,
    itemIndex: number,
    qIndex: number,
    errors: ImportError[],
    warnings: ImportWarning[],
  ): void {
    const prefix = `modules[${moduleIndex}].contentItems[${itemIndex}].quiz.questions[${qIndex}]`;

    if (!question.questionText || typeof question.questionText !== 'string') {
      errors.push({
        field: `${prefix}.questionText`,
        message: 'Missing or invalid question text',
        code: 'INVALID_QUESTION_TEXT',
      });
    }

    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6) {
      errors.push({
        field: `${prefix}.options`,
        message: 'Question must have between 2 and 6 options',
        code: 'INVALID_OPTIONS_COUNT',
      });
    } else {
      const correctCount = question.options.filter(
        (opt: any) => opt.isCorrect === true,
      ).length;
      if (correctCount !== 1) {
        errors.push({
          field: `${prefix}.options`,
          message: 'Question must have exactly one correct answer',
          code: 'INVALID_CORRECT_COUNT',
        });
      }
    }
  }

  /**
   * Validate tab structure
   * Requirements: 16.6
   */
  private validateTab(
    tab: any,
    index: number,
    errors: ImportError[],
    warnings: ImportWarning[],
  ): void {
    const prefix = `tabs[${index}]`;

    if (!tab.title || typeof tab.title !== 'string') {
      errors.push({
        field: `${prefix}.title`,
        message: 'Missing or invalid tab title',
        code: 'INVALID_TAB_TITLE',
      });
    }

    const validTabTypes = [
      'COURSE_INFO',
      'SYLLABUS',
      'CONTENT',
      'PROGRESS',
      'DISCUSSION',
      'CUSTOM_STATIC',
      'CUSTOM_LINK',
    ];
    if (!tab.type || !validTabTypes.includes(tab.type)) {
      errors.push({
        field: `${prefix}.type`,
        message: 'Missing or invalid tab type',
        code: 'INVALID_TAB_TYPE',
      });
    }
  }

  /**
   * Create new course with unique identifiers to avoid conflicts
   * Requirements: 16.7
   */
  private async createCourseFromExport(
    exportedCourse: ExportedCourse,
    userId: string,
  ): Promise<string> {
    const { course, modules, tabs } = exportedCourse;

    // Create course with new UUID
    const newCourse = await this.prisma.course.create({
      data: {
        title: `${course.title} (Imported)`,
        description: course.description,
        language: course.language as Language,
        status: CourseStatus.DRAFT, // Always import as draft
        enrollmentStart: course.enrollmentStart
          ? new Date(course.enrollmentStart)
          : null,
        enrollmentEnd: course.enrollmentEnd
          ? new Date(course.enrollmentEnd)
          : null,
        courseStart: course.courseStart ? new Date(course.courseStart) : null,
        courseEnd: course.courseEnd ? new Date(course.courseEnd) : null,
        ownerId: userId,
      },
    });

    // Create modules with new UUIDs
    const moduleMap = new Map<number, string>(); // Map old order to new ID

    for (const module of modules) {
      const newModule = await this.createModule(
        module,
        newCourse.id,
        moduleMap,
        userId,
      );
      moduleMap.set(module.order, newModule.id);
    }

    // Create tabs with new UUIDs
    if (tabs && tabs.length > 0) {
      for (const tab of tabs) {
        await this.createTab(tab, newCourse.id);
      }
    }

    return newCourse.id;
  }

  /**
   * Create module from exported data
   * Requirements: 16.7
   */
  private async createModule(
    moduleData: ExportedModule,
    courseId: string,
    moduleMap: Map<number, string>,
    userId: string,
  ): Promise<any> {
    // Resolve prerequisite if exists
    let prerequisiteId: string | null = null;
    if (moduleData.prerequisiteOrder !== null) {
      prerequisiteId = moduleMap.get(moduleData.prerequisiteOrder) || null;
    }

    const newModule = await this.prisma.module.create({
      data: {
        title: moduleData.title,
        description: moduleData.description,
        order: moduleData.order,
        courseId,
        prerequisiteId,
      },
    });

    // Create content items
    for (const item of moduleData.contentItems) {
      await this.createContentItem(item, newModule.id, userId);
    }

    return newModule;
  }

  /**
   * Create content item from exported data
   * Requirements: 16.7
   */
  private async createContentItem(
    itemData: ExportedContentItem,
    moduleId: string,
    userId: string,
  ): Promise<void> {
    const contentItem = await this.prisma.contentItem.create({
      data: {
        title: itemData.title,
        type: itemData.type as ContentType,
        order: itemData.order,
        mandatory: itemData.mandatory,
        moduleId,
        textContent: itemData.textContent,
        videoUrl: itemData.videoUrl,
        videoEmbedCode: itemData.videoEmbedCode,
        documentUrl: itemData.documentUrl,
      },
    });

    // Create quiz if present
    if (itemData.quiz && itemData.type === 'QUIZ') {
      await this.createQuiz(itemData.quiz, contentItem.id);
    }

    // Create video if present
    if (itemData.video && itemData.type === 'VIDEO') {
      await this.createVideo(itemData.video, contentItem.id, userId);
    }
  }

  /**
   * Create quiz from exported data
   * Requirements: 16.7
   */
  private async createQuiz(
    quizData: ExportedQuiz,
    contentItemId: string,
  ): Promise<void> {
    const quiz = await this.prisma.quiz.create({
      data: {
        contentItemId,
        passingScore: quizData.passingScore,
        maxAttempts: quizData.maxAttempts,
      },
    });

    // Create questions
    for (const questionData of quizData.questions) {
      await this.createQuestion(questionData, quiz.id);
    }
  }

  /**
   * Create question from exported data
   * Requirements: 16.7
   */
  private async createQuestion(
    questionData: ExportedQuestion,
    quizId: string,
  ): Promise<void> {
    const question = await this.prisma.question.create({
      data: {
        quizId,
        questionText: questionData.questionText,
        order: questionData.order,
      },
    });

    // Create options
    for (const optionData of questionData.options) {
      await this.prisma.questionOption.create({
        data: {
          questionId: question.id,
          optionText: optionData.optionText,
          isCorrect: optionData.isCorrect,
          order: optionData.order,
        },
      });
    }
  }

  /**
   * Create video from exported data
   * Requirements: 16.7
   */
  private async createVideo(
    videoData: any,
    contentItemId: string,
    uploaderId: string,
  ): Promise<void> {
    await this.prisma.video.create({
      data: {
        contentItemId,
        uploaderId,
        title: videoData.title,
        description: videoData.description,
        duration: videoData.duration,
        format: videoData.format,
        thumbnailUrl: videoData.thumbnailUrl,
        youtubeUrl: videoData.youtubeUrl,
      },
    });
  }

  /**
   * Create tab from exported data
   * Requirements: 16.7
   */
  private async createTab(tabData: ExportedTab, courseId: string): Promise<void> {
    await this.prisma.tab.create({
      data: {
        courseId,
        title: tabData.title,
        type: tabData.type as TabType,
        order: tabData.order,
        visible: tabData.visible,
        content: tabData.content,
        externalUrl: tabData.externalUrl,
      },
    });
  }
}
