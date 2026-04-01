import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TabType, UserRole } from '@prisma/client';
import { CreateTabDto } from '../dtos/create-tab.dto';
import { UpdateTabDto } from '../dtos/update-tab.dto';
import { TabResponseDto } from '../dtos/tab-response.dto';
import { Tab, DEFAULT_TAB_TYPES, CUSTOM_TAB_TYPES } from '../types/tab.types';

/**
 * Tab service for course tab management
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.11
 * 
 * NOTE: This service requires the Prisma client to be generated with the Tab model.
 * Run 'npx prisma generate' if you encounter type errors.
 */
@Injectable()
export class TabService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tab
   * Requirements: 20.1, 20.3, 20.7, 20.8
   */
  async createTab(
    courseId: string,
    dto: CreateTabDto,
    userId: string,
  ): Promise<TabResponseDto> {
    await this.validateCourseExists(courseId);
    await this.validateUserCanManageTabs(userId, courseId);
    this.validateTabContent(dto);
    const nextOrder = await this.getNextTabOrder(courseId);
    const tab = await (this.prisma as any).tab.create({
      data: {
        courseId,
        title: dto.title,
        type: dto.type,
        order: nextOrder,
        content: dto.content || null,
        externalUrl: dto.externalUrl || null,
      },
    });
    return this.mapToTabResponse(tab);
  }

  /**
   * Update tab
   * Requirements: 20.1, 20.3, 20.5, 20.6, 20.7, 20.8
   */
  async updateTab(
    tabId: string,
    dto: UpdateTabDto,
    userId: string,
  ): Promise<TabResponseDto> {
    const tab = await this.findTabById(tabId);
    await this.validateUserCanManageTabs(userId, tab.courseId);
    this.validateDefaultTabModification(tab);
    await this.validateVisibilityChange(tab, dto.visible);
    this.validateContentUpdate(tab, dto);
    this.validateUrlUpdate(tab, dto);
    const updatedTab = await (this.prisma as any).tab.update({
      where: { id: tabId },
      data: {
        title: dto.title,
        content: dto.content,
        externalUrl: dto.externalUrl,
        visible: dto.visible,
      },
    });
    return this.mapToTabResponse(updatedTab);
  }

  /**
   * Delete tab
   * Requirements: 20.1, 20.6
   */
  async deleteTab(tabId: string, userId: string): Promise<void> {
    const tab = await this.findTabById(tabId);
    await this.validateUserCanManageTabs(userId, tab.courseId);
    this.validateDefaultTabModification(tab);
    await this.validateContentTabDeletion(tab);
    await (this.prisma as any).tab.delete({
      where: { id: tabId },
    });
  }

  /**
   * Get tab by ID
   * Requirements: 20.1
   */
  async getTabById(tabId: string): Promise<TabResponseDto> {
    const tab = await this.findTabById(tabId);
    return this.mapToTabResponse(tab);
  }

  /**
   * Get all tabs for a course
   * Requirements: 20.2, 20.10, 20.11
   */
  async getCourseTabs(courseId: string): Promise<TabResponseDto[]> {
    await this.validateCourseExists(courseId);
    const tabs = await (this.prisma as any).tab.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
    return tabs.map((tab: Tab) => this.mapToTabResponse(tab));
  }

  /**
   * Get visible tabs for learners
   * Requirements: 20.2, 20.9, 20.10
   */
  async getVisibleTabs(courseId: string): Promise<TabResponseDto[]> {
    await this.validateCourseExists(courseId);
    const tabs = await (this.prisma as any).tab.findMany({
      where: {
        courseId,
        visible: true,
      },
      orderBy: { order: 'asc' },
    });
    return tabs.map((tab: Tab) => this.mapToTabResponse(tab));
  }

  /**
   * Reorder tabs
   * Requirements: 20.4, 20.10
   */
  async reorderTabs(
    courseId: string,
    tabIds: string[],
    userId: string,
  ): Promise<TabResponseDto[]> {
    await this.validateCourseExists(courseId);
    await this.validateUserCanManageTabs(userId, courseId);
    await this.validateTabsBelongToCourse(courseId, tabIds);
    await this.updateTabOrders(tabIds);
    return this.getCourseTabs(courseId);
  }

  /**
   * Validate course exists
   */
  private async validateCourseExists(courseId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
  }

  /**
   * Validate user can manage tabs
   */
  private async validateUserCanManageTabs(
    userId: string,
    courseId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.ADMIN) {
      return;
    }
    if (user.role === UserRole.INSTRUCTOR) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });
      if (course?.ownerId !== userId) {
        throw new ForbiddenException('You can only manage tabs for your own courses');
      }
      return;
    }
    throw new ForbiddenException('Only instructors and admins can manage tabs');
  }

  /**
   * Validate tab content based on type
   * Requirements: 20.3, 20.7, 20.8
   */
  private validateTabContent(dto: CreateTabDto): void {
    if (dto.type === 'CUSTOM_STATIC' && !dto.content) {
      throw new BadRequestException('Content is required for CUSTOM_STATIC tabs');
    }
    if (dto.type === 'CUSTOM_STATIC' && dto.content) {
      this.validateRichTextContent(dto.content);
    }
    if (dto.type === 'CUSTOM_LINK' && !dto.externalUrl) {
      throw new BadRequestException('External URL is required for CUSTOM_LINK tabs');
    }
    if (dto.type === 'CUSTOM_LINK' && dto.externalUrl) {
      this.validateExternalUrl(dto.externalUrl);
    }
    const defaultTypes = ['COURSE_INFO', 'SYLLABUS', 'CONTENT', 'PROGRESS', 'DISCUSSION'];
    if (defaultTypes.includes(dto.type)) {
      throw new BadRequestException(
        'Cannot create default tab types. Default tabs are system-managed.',
      );
    }
  }

  /**
   * Validate default tab modification
   */
  private validateDefaultTabModification(tab: Tab): void {
    const defaultTypes = ['COURSE_INFO', 'SYLLABUS', 'CONTENT', 'PROGRESS', 'DISCUSSION'];
    if (defaultTypes.includes(tab.type as string)) {
      throw new BadRequestException('Cannot modify or delete default tabs');
    }
  }

  /**
   * Validate content tab deletion
   * Requirements: 20.6
   */
  private async validateContentTabDeletion(tab: Tab): Promise<void> {
    if (tab.type === 'CONTENT') {
      const visibleContentTabs = await this.countVisibleContentTabs(tab.courseId);
      if (visibleContentTabs <= 1) {
        throw new BadRequestException(
          'Cannot delete the last visible Content tab',
        );
      }
    }
  }

  /**
   * Validate visibility change
   * Requirements: 20.5, 20.6
   */
  private async validateVisibilityChange(
    tab: Tab,
    newVisibility?: boolean,
  ): Promise<void> {
    if (newVisibility === false && tab.type === 'CONTENT' && tab.visible) {
      const visibleContentTabs = await this.countVisibleContentTabs(tab.courseId);
      if (visibleContentTabs <= 1) {
        throw new BadRequestException(
          'Cannot hide the last visible Content tab',
        );
      }
    }
  }

  /**
   * Validate content update for static tabs
   * Requirements: 20.7
   */
  private validateContentUpdate(tab: Tab, dto: UpdateTabDto): void {
    if (dto.content !== undefined && tab.type === 'CUSTOM_STATIC') {
      this.validateRichTextContent(dto.content);
    }
  }

  /**
   * Validate URL update for link tabs
   * Requirements: 20.8
   */
  private validateUrlUpdate(tab: Tab, dto: UpdateTabDto): void {
    if (dto.externalUrl !== undefined && tab.type === 'CUSTOM_LINK') {
      this.validateExternalUrl(dto.externalUrl);
    }
  }

  /**
   * Validate rich text content for HTML/markdown
   * Requirements: 20.7
   */
  private validateRichTextContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }
    if (content.length > 50000) {
      throw new BadRequestException('Content exceeds maximum length of 50000 characters');
    }
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        throw new BadRequestException(
          'Content contains potentially dangerous HTML/JavaScript',
        );
      }
    }
  }

  /**
   * Validate external URL format and protocol
   * Requirements: 20.8
   */
  private validateExternalUrl(url: string): void {
    if (!url || url.trim().length === 0) {
      throw new BadRequestException('External URL cannot be empty');
    }
    try {
      const parsedUrl = new URL(url);
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        throw new BadRequestException(
          'External URL must use HTTP or HTTPS protocol',
        );
      }
      if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
        throw new BadRequestException('External URL cannot point to localhost');
      }
    } catch (err) {
      throw new BadRequestException('Invalid external URL format');
    }
  }

  /**
   * Count visible Content tabs for a course
   * Requirements: 20.6
   */
  private async countVisibleContentTabs(courseId: string): Promise<number> {
    return (this.prisma as any).tab.count({
      where: {
        courseId,
        type: 'CONTENT',
        visible: true,
      },
    });
  }

  /**
   * Find tab by ID
   */
  private async findTabById(tabId: string): Promise<Tab> {
    const tab = await (this.prisma as any).tab.findUnique({
      where: { id: tabId },
    });
    if (!tab) {
      throw new NotFoundException('Tab not found');
    }
    return tab as Tab;
  }

  /**
   * Get next tab order
   */
  private async getNextTabOrder(courseId: string): Promise<number> {
    const lastTab = await (this.prisma as any).tab.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    });
    return lastTab ? lastTab.order + 1 : 0;
  }

  /**
   * Validate tabs belong to course
   */
  private async validateTabsBelongToCourse(
    courseId: string,
    tabIds: string[],
  ): Promise<void> {
    const tabs = await (this.prisma as any).tab.findMany({
      where: {
        id: { in: tabIds },
        courseId,
      },
    });
    if (tabs.length !== tabIds.length) {
      throw new BadRequestException('Some tabs do not belong to this course');
    }
  }

  /**
   * Update tab orders
   */
  private async updateTabOrders(tabIds: string[]): Promise<void> {
    const updates = tabIds.map((tabId, index) =>
      (this.prisma as any).tab.update({
        where: { id: tabId },
        data: { order: index },
      }),
    );
    await (this.prisma as any).$transaction(updates);
  }

  /**
   * Map tab to response DTO
   */
  private mapToTabResponse(tab: Tab): TabResponseDto {
    return {
      id: tab.id,
      courseId: tab.courseId,
      title: tab.title,
      type: tab.type as TabType,
      order: tab.order,
      visible: tab.visible,
      content: tab.content || undefined,
      externalUrl: tab.externalUrl || undefined,
      createdAt: tab.createdAt,
      updatedAt: tab.updatedAt,
    };
  }
}
