import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateAnnouncementDto } from '../dtos/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dtos/update-announcement.dto';
import { AnnouncementResponseDto } from '../dtos/announcement-response.dto';
import { NotificationService } from '../../notification/services/notification.service';

/**
 * Announcement service for course announcement management
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.10, 21.11
 */
@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new announcement
   * Requirements: 21.1, 21.2, 21.3, 21.9, 21.10
   */
  async createAnnouncement(
    courseId: string,
    dto: CreateAnnouncementDto,
    userId: string,
  ): Promise<AnnouncementResponseDto> {
    await this.validateCourseExists(courseId);
    await this.validateUserCanManageAnnouncements(userId, courseId);
    this.validateRichTextContent(dto.content);
    const announcement = await this.prisma.announcement.create({
      data: {
        courseId,
        title: dto.title,
        content: dto.content,
      },
    });
    await this.notificationService.sendAnnouncementEmail(
      courseId,
      dto.title,
      dto.content,
    );
    return this.mapToAnnouncementResponse(announcement);
  }

  /**
   * Update announcement
   * Requirements: 21.6, 21.9
   */
  async updateAnnouncement(
    announcementId: string,
    dto: UpdateAnnouncementDto,
    userId: string,
  ): Promise<AnnouncementResponseDto> {
    const announcement = await this.findAnnouncementById(announcementId);
    await this.validateUserCanManageAnnouncements(userId, announcement.courseId);
    if (dto.content) {
      this.validateRichTextContent(dto.content);
    }
    const updatedAnnouncement = await this.prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: dto.title,
        content: dto.content,
      },
    });
    return this.mapToAnnouncementResponse(updatedAnnouncement);
  }

  /**
   * Soft delete announcement
   * Requirements: 21.7, 21.8
   */
  async deleteAnnouncement(announcementId: string, userId: string): Promise<void> {
    const announcement = await this.findAnnouncementById(announcementId);
    await this.validateUserCanManageAnnouncements(userId, announcement.courseId);
    await this.prisma.announcement.update({
      where: { id: announcementId },
      data: { deleted: true },
    });
  }

  /**
   * Get announcement by ID
   * Requirements: 21.1
   */
  async getAnnouncementById(announcementId: string): Promise<AnnouncementResponseDto> {
    const announcement = await this.findAnnouncementById(announcementId);
    return this.mapToAnnouncementResponse(announcement);
  }

  /**
   * Get all announcements for a course (CMS - includes deleted)
   * Requirements: 21.4, 21.8
   */
  async getCourseAnnouncementsCms(courseId: string): Promise<AnnouncementResponseDto[]> {
    await this.validateCourseExists(courseId);
    const announcements = await this.prisma.announcement.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    return announcements.map((announcement) =>
      this.mapToAnnouncementResponse(announcement),
    );
  }

  /**
   * Get visible announcements for learners (LMS - excludes deleted)
   * Requirements: 21.4, 21.5, 21.8
   */
  async getCourseAnnouncementsLms(
    courseId: string,
    userId: string,
  ): Promise<AnnouncementResponseDto[]> {
    await this.validateCourseExists(courseId);
    await this.validateUserIsEnrolled(userId, courseId);
    const announcements = await this.prisma.announcement.findMany({
      where: {
        courseId,
        deleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    return announcements.map((announcement) =>
      this.mapToAnnouncementResponse(announcement),
    );
  }

  /**
   * Mark announcement as read
   * Requirements: 21.11
   */
  async markAnnouncementAsRead(
    announcementId: string,
    userId: string,
  ): Promise<void> {
    const announcement = await this.findAnnouncementById(announcementId);
    await this.validateUserIsEnrolled(userId, announcement.courseId);
    const existingRead = await this.prisma.announcementRead.findUnique({
      where: {
        announcementId_userId: {
          announcementId,
          userId,
        },
      },
    });
    if (!existingRead) {
      await this.prisma.announcementRead.create({
        data: {
          announcementId,
          userId,
        },
      });
    }
  }

  /**
   * Get unread announcement count for a course
   * Requirements: 21.11
   */
  async getUnreadAnnouncementCount(
    courseId: string,
    userId: string,
  ): Promise<number> {
    await this.validateCourseExists(courseId);
    await this.validateUserIsEnrolled(userId, courseId);
    const totalAnnouncements = await this.prisma.announcement.count({
      where: {
        courseId,
        deleted: false,
      },
    });
    const readAnnouncements = await this.prisma.announcementRead.count({
      where: {
        userId,
        announcement: {
          courseId,
          deleted: false,
        },
      },
    });
    return totalAnnouncements - readAnnouncements;
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
   * Validate user can manage announcements
   * Requirements: 21.1, 21.6, 21.7
   */
  private async validateUserCanManageAnnouncements(
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
        throw new ForbiddenException(
          'You can only manage announcements for your own courses',
        );
      }
      return;
    }
    throw new ForbiddenException(
      'Only instructors and admins can manage announcements',
    );
  }

  /**
   * Validate user is enrolled in course
   * Requirements: 21.5
   */
  private async validateUserIsEnrolled(
    userId: string,
    courseId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: 'ACTIVE',
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled to view announcements');
    }
  }

  /**
   * Validate rich text content for HTML/markdown
   * Requirements: 21.2, 21.9
   */
  private validateRichTextContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }
    if (content.length > 5000) {
      throw new BadRequestException(
        'Content exceeds maximum length of 5000 characters',
      );
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
   * Find announcement by ID
   */
  private async findAnnouncementById(announcementId: string): Promise<any> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement;
  }

  /**
   * Map announcement to response DTO
   */
  private mapToAnnouncementResponse(announcement: {
    id: string;
    courseId: string;
    title: string;
    content: string;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AnnouncementResponseDto {
    return {
      id: announcement.id,
      courseId: announcement.courseId,
      title: announcement.title,
      content: announcement.content,
      deleted: announcement.deleted,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  }
}
