import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GradeBreakdownDto } from '../dtos/grade-breakdown.dto';
import { GradeHistoryDto, GradeHistoryEntryDto } from '../dtos/grade-history.dto';
import { CourseGradeDto } from '../dtos/course-grade.dto';
import { ModuleGradeDto } from '../dtos/module-grade.dto';
import { ItemGradeDto } from '../dtos/item-grade.dto';
import { ContentType } from '@prisma/client';

/**
 * Service for calculating and managing grades at item, module, and course levels
 */
@Injectable()
export class GradingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate grade for a content item based on quiz attempts
   * Uses the best score from all attempts
   */
  async calculateItemGrade(userId: string, contentItemId: string): Promise<number> {
    const contentItem = await this.findContentItemWithQuiz(contentItemId);
    this.validateContentItemIsQuiz(contentItem);
    if (!contentItem.quiz) {
      throw new BadRequestException('Quiz not found for content item');
    }
    const bestScore = await this.getBestQuizScore(userId, contentItem.quiz.id);
    return bestScore;
  }

  /**
   * Calculate module grade as weighted average of item grades
   * Formula: sum(item_score * item_weight) / sum(item_weights)
   */
  async calculateModuleGrade(userId: string, moduleId: string): Promise<number> {
    const module = await this.findModuleWithItems(moduleId);
    if (module.contentItems.length === 0) {
      return 0;
    }
    const latestGrades = await this.getLatestGradesForModule(userId, moduleId, module.contentItems);
    if (latestGrades.size === 0) {
      return 0;
    }
    return this.computeWeightedAverage(latestGrades);
  }

  /**
   * Calculate course grade as average of module grades
   * Formula: sum(module_grades) / count(modules)
   */
  async calculateCourseGrade(userId: string, courseId: string): Promise<number> {
    const course = await this.findCourseWithModules(courseId);
    if (course.modules.length === 0) {
      return 0;
    }
    const moduleGrades = await this.calculateAllModuleGrades(userId, course.modules);
    if (moduleGrades.length === 0) {
      return 0;
    }
    return this.computeAverage(moduleGrades);
  }

  /**
   * Get detailed grade breakdown at all levels
   */
  async getGradeBreakdown(userId: string, courseId: string): Promise<GradeBreakdownDto> {
    const course = await this.findCourseWithModules(courseId);
    const moduleGrades = await this.buildModuleGrades(userId, course.modules);
    const courseGrade = await this.calculateCourseGrade(userId, courseId);
    const letterGrade = this.getLetterGrade(courseGrade);
    const courseGradeDto = this.buildCourseGradeDto(
      course,
      courseGrade,
      letterGrade,
      moduleGrades,
    );
    return {
      userId,
      courseGrade: courseGradeDto,
      calculatedAt: new Date(),
    };
  }

  /**
   * Get grade history for a user in a course
   */
  async getGradeHistory(userId: string, courseId: string): Promise<GradeHistoryDto> {
    const course = await this.findCourseWithModules(courseId);
    const contentItemIds = this.extractContentItemIds(course.modules);
    const grades = await this.findGradesWithRelations(userId, contentItemIds);
    const history = this.mapGradesToHistory(grades);
    return {
      userId,
      courseId,
      history,
    };
  }

  /**
   * Record a new grade for a content item
   */
  async recordGrade(
    userId: string,
    contentItemId: string,
    score: number,
    weight: number = 1.0,
  ): Promise<void> {
    const contentItem = await this.findContentItemWithModule(contentItemId);
    await this.createGradeRecord(userId, contentItem, score, weight, false, null);
  }

  /**
   * Update an existing grade (creates new record for history)
   */
  async updateGrade(gradeId: string, score: number, reason: string): Promise<void> {
    const existingGrade = await this.findGradeById(gradeId);
    await this.createGradeRecord(
      existingGrade.userId,
      {
        id: existingGrade.contentItemId!,
        moduleId: existingGrade.moduleId!,
      },
      score,
      existingGrade.weight,
      true,
      reason,
    );
  }

  /**
   * Get all overridden grades for a course
   */
  async getCourseOverrides(courseId: string): Promise<GradeHistoryDto[]> {
    const course = await this.findCourseWithModules(courseId);
    const contentItemIds = this.extractContentItemIds(course.modules);
    const overriddenGrades = await this.findOverriddenGrades(contentItemIds);
    const groupedByUser = this.groupGradesByUser(overriddenGrades);
    return this.buildGradeHistoryDtos(groupedByUser, courseId);
  }

  /**
   * Get grade history for a specific content item
   */
  async getContentItemGradeHistory(contentItemId: string): Promise<GradeHistoryDto[]> {
    await this.findContentItemWithModule(contentItemId);
    const grades = await this.findGradesByContentItem(contentItemId);
    const groupedByUser = this.groupGradesByUser(grades);
    return this.buildGradeHistoryDtos(groupedByUser, null);
  }

  /**
   * Convert percentage grade to letter grade
   */
  getLetterGrade(percentage: number): string {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }

  private async findContentItemWithQuiz(contentItemId: string): Promise<any> {
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: { quiz: true },
    });
    if (!contentItem) {
      throw new NotFoundException(`Content item ${contentItemId} not found`);
    }
    return contentItem;
  }

  private validateContentItemIsQuiz(contentItem: any): void {
    if (contentItem.type !== ContentType.QUIZ) {
      throw new BadRequestException('Content item is not a quiz');
    }
  }

  private async getBestQuizScore(userId: string, quizId: string): Promise<number> {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { score: 'desc' },
      take: 1,
    });
    return attempts.length === 0 ? 0 : attempts[0].score;
  }

  private async findModuleWithItems(moduleId: string): Promise<any> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        contentItems: {
          where: { type: ContentType.QUIZ },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!module) {
      throw new NotFoundException(`Module ${moduleId} not found`);
    }
    return module;
  }

  private async getLatestGradesForModule(
    userId: string,
    moduleId: string,
    contentItems: any[],
  ): Promise<Map<string, any>> {
    const grades = await this.prisma.grade.findMany({
      where: {
        userId,
        moduleId,
        contentItemId: { in: contentItems.map((item: any) => item.id) },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.extractLatestGrades(grades);
  }

  private extractLatestGrades(grades: any[]): Map<string, any> {
    const latestGrades = new Map<string, any>();
    for (const grade of grades) {
      if (!latestGrades.has(grade.contentItemId)) {
        latestGrades.set(grade.contentItemId, grade);
      }
    }
    return latestGrades;
  }

  private computeWeightedAverage(grades: Map<string, any>): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const grade of grades.values()) {
      totalWeightedScore += grade.grade * grade.weight;
      totalWeight += grade.weight;
    }
    return totalWeight === 0 ? 0 : totalWeightedScore / totalWeight;
  }

  private async findCourseWithModules(courseId: string): Promise<any> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            contentItems: {
              where: { type: ContentType.QUIZ },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }
    return course;
  }

  private async calculateAllModuleGrades(
    userId: string,
    modules: any[],
  ): Promise<number[]> {
    const moduleGrades: number[] = [];
    for (const module of modules) {
      const moduleGrade = await this.calculateModuleGrade(userId, module.id);
      if (moduleGrade > 0) {
        moduleGrades.push(moduleGrade);
      }
    }
    return moduleGrades;
  }

  private computeAverage(values: number[]): number {
    const sum = values.reduce((acc: number, value: number) => acc + value, 0);
    return sum / values.length;
  }

  private async buildModuleGrades(
    userId: string,
    modules: any[],
  ): Promise<ModuleGradeDto[]> {
    const moduleGrades: ModuleGradeDto[] = [];
    for (const module of modules) {
      const itemGrades = await this.buildItemGrades(userId, module.contentItems);
      if (itemGrades.length > 0) {
        const moduleGrade = await this.calculateModuleGrade(userId, module.id);
        const letterGrade = this.getLetterGrade(moduleGrade);
        moduleGrades.push({
          moduleId: module.id,
          moduleTitle: module.title,
          grade: moduleGrade,
          letterGrade,
          itemGrades,
          totalItems: module.contentItems.length,
          completedItems: itemGrades.length,
        });
      }
    }
    return moduleGrades;
  }

  private async buildItemGrades(
    userId: string,
    contentItems: any[],
  ): Promise<ItemGradeDto[]> {
    const itemGrades: ItemGradeDto[] = [];
    for (const contentItem of contentItems) {
      const grades = await this.prisma.grade.findMany({
        where: { userId, contentItemId: contentItem.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (grades.length > 0) {
        itemGrades.push(this.mapGradeToItemDto(grades[0], contentItem));
      }
    }
    return itemGrades;
  }

  private mapGradeToItemDto(grade: any, contentItem: any): ItemGradeDto {
    return {
      contentItemId: contentItem.id,
      contentItemTitle: contentItem.title,
      score: grade.grade,
      weight: grade.weight,
      overridden: grade.overridden,
      overrideReason: grade.overrideReason,
      createdAt: grade.createdAt,
    };
  }

  private buildCourseGradeDto(
    course: any,
    courseGrade: number,
    letterGrade: string,
    moduleGrades: ModuleGradeDto[],
  ): CourseGradeDto {
    return {
      courseId: course.id,
      courseTitle: course.title,
      grade: courseGrade,
      letterGrade,
      moduleGrades,
      totalModules: course.modules.length,
      gradedModules: moduleGrades.length,
    };
  }

  private extractContentItemIds(modules: any[]): string[] {
    return modules.flatMap((module: any) =>
      module.contentItems.map((item: any) => item.id),
    );
  }

  private async findGradesWithRelations(userId: string, contentItemIds: string[]) {
    return this.prisma.grade.findMany({
      where: {
        userId,
        contentItemId: { in: contentItemIds },
      },
      include: {
        contentItem: true,
        module: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private mapGradesToHistory(grades: any[]): GradeHistoryEntryDto[] {
    return grades.map((grade: any) => ({
      id: grade.id,
      contentItemId: grade.contentItemId,
      contentItemTitle: grade.contentItem?.title,
      moduleId: grade.moduleId,
      moduleTitle: grade.module?.title,
      grade: grade.grade,
      weight: grade.weight,
      overridden: grade.overridden,
      overrideReason: grade.overrideReason,
      createdAt: grade.createdAt,
    }));
  }

  private async findContentItemWithModule(contentItemId: string): Promise<any> {
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: { module: true },
    });
    if (!contentItem) {
      throw new NotFoundException(`Content item ${contentItemId} not found`);
    }
    return contentItem;
  }

  private async createGradeRecord(
    userId: string,
    contentItem: { id: string; moduleId: string },
    score: number,
    weight: number,
    overridden: boolean,
    overrideReason: string | null,
  ): Promise<void> {
    await this.prisma.grade.create({
      data: {
        userId,
        contentItemId: contentItem.id,
        moduleId: contentItem.moduleId,
        grade: score,
        weight,
        overridden,
        overrideReason,
      },
    });
  }

  private async findGradeById(gradeId: string): Promise<any> {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
    });
    if (!grade) {
      throw new NotFoundException(`Grade ${gradeId} not found`);
    }
    return grade;
  }

  private async findOverriddenGrades(contentItemIds: string[]): Promise<any[]> {
    return this.prisma.grade.findMany({
      where: {
        contentItemId: { in: contentItemIds },
        overridden: true,
      },
      include: {
        contentItem: true,
        module: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findGradesByContentItem(contentItemId: string): Promise<any[]> {
    return this.prisma.grade.findMany({
      where: { contentItemId },
      include: {
        contentItem: true,
        module: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private groupGradesByUser(grades: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    for (const grade of grades) {
      const userId = grade.userId;
      if (!grouped.has(userId)) {
        grouped.set(userId, []);
      }
      grouped.get(userId)!.push(grade);
    }
    return grouped;
  }

  private buildGradeHistoryDtos(
    groupedGrades: Map<string, any[]>,
    courseId: string | null,
  ): GradeHistoryDto[] {
    const historyDtos: GradeHistoryDto[] = [];
    for (const [userId, grades] of groupedGrades.entries()) {
      const history = this.mapGradesToHistory(grades);
      historyDtos.push({
        userId,
        courseId: courseId || grades[0]?.contentItem?.module?.courseId || '',
        history,
      });
    }
    return historyDtos;
  }
}
