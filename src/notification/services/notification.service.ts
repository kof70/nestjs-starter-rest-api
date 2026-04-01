import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailTemplates } from '../templates/email-templates';
import { EmailTemplateData, EmailConfig } from '../types/email-template.types';
import {
  UpdateNotificationPreferenceDto,
  NotificationPreferenceResponseDto,
} from '../dtos/notification-preference.dto';
import { NotificationLogResponseDto } from '../dtos/notification-log.dto';

/**
 * Notification service for email notifications
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: Transporter;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('bulk-email') private readonly bulkEmailQueue: Queue,
  ) {
    this.initializeTransporter();
  }

  /**
   * Initialize NodeMailer transporter
   * Requirements: 17.5
   */
  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST || 'localhost';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpFrom = process.env.SMTP_FROM || 'noreply@lms.com';
    if (!smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP credentials not configured. Email notifications will be logged but not sent.',
      );
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
  }

  /**
   * Send welcome email on enrollment
   * Requirements: 17.1
   */
  async sendWelcomeEmail(userId: string, courseId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const preferences = await this.getUserPreferences(userId);
    if (!preferences.emailOnEnrollment) {
      this.logger.log(
        `Skipping welcome email for user ${userId} - preference disabled`,
      );
      return;
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    const templateData: EmailTemplateData = {
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      courseTitle: course.title,
      language: user.language,
    };
    const { subject, html, text } = EmailTemplates.generateWelcomeEmail(templateData);
    await this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
    await this.logNotification(userId, 'welcome', subject, html);
  }

  /**
   * Send course published notification
   * Requirements: 17.2
   */
  async sendCoursePublishedEmail(courseId: string): Promise<void> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: 'ACTIVE',
      },
      include: {
        user: true,
        course: true,
      },
    });
    for (const enrollment of enrollments) {
      const preferences = await this.getUserPreferences(enrollment.userId);
      if (!preferences.emailOnCoursePublished) {
        this.logger.log(
          `Skipping course published email for user ${enrollment.userId} - preference disabled`,
        );
        continue;
      }
      const templateData: EmailTemplateData = {
        userName:
          `${enrollment.user.firstName || ''} ${enrollment.user.lastName || ''}`.trim() ||
          enrollment.user.email,
        courseTitle: enrollment.course.title,
        language: enrollment.user.language,
      };
      const { subject, html, text } =
        EmailTemplates.generateCoursePublishedEmail(templateData);
      await this.sendEmail({
        to: enrollment.user.email,
        subject,
        html,
        text,
      });
      await this.logNotification(enrollment.userId, 'course_published', subject, html);
    }
  }

  /**
   * Send certificate notification
   * Requirements: 17.3
   */
  async sendCertificateEmail(
    userId: string,
    courseId: string,
    certificateId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const preferences = await this.getUserPreferences(userId);
    if (!preferences.emailOnCertificate) {
      this.logger.log(
        `Skipping certificate email for user ${userId} - preference disabled`,
      );
      return;
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    const templateData: EmailTemplateData = {
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      courseTitle: course.title,
      certificateId,
      language: user.language,
    };
    const { subject, html, text } = EmailTemplates.generateCertificateEmail(templateData);
    await this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
    await this.logNotification(userId, 'certificate', subject, html);
  }

  /**
   * Send quiz reminder notification
   * Requirements: 17.4
   */
  async sendQuizReminderEmail(
    userId: string,
    courseId: string,
    quizTitle: string,
    deadline: Date,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const preferences = await this.getUserPreferences(userId);
    if (!preferences.emailOnQuizReminder) {
      this.logger.log(
        `Skipping quiz reminder email for user ${userId} - preference disabled`,
      );
      return;
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    const templateData: EmailTemplateData = {
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      courseTitle: course.title,
      quizTitle,
      quizDeadline: deadline,
      language: user.language,
    };
    const { subject, html, text } = EmailTemplates.generateQuizReminderEmail(templateData);
    await this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
    await this.logNotification(userId, 'quiz_reminder', subject, html);
  }

  /**
   * Send bulk email to multiple users (async with queue)
   * Requirements: 17.8
   */
  async sendBulkEmail(
    userIds: string[],
    emailSubject: string,
    emailContent: string,
  ): Promise<void> {
    this.logger.log(`Queueing bulk email for ${userIds.length} users`);
    await this.bulkEmailQueue.add('send-bulk', {
      userIds,
      subject: emailSubject,
      content: emailContent,
    });
  }

  /**
   * Send announcement notification email
   * Requirements: 21.10
   */
  async sendAnnouncementEmail(
    courseId: string,
    announcementTitle: string,
    announcementContent: string,
  ): Promise<void> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: 'ACTIVE',
      },
      include: {
        user: true,
        course: true,
      },
    });
    for (const enrollment of enrollments) {
      const preferences = await this.getUserPreferences(enrollment.userId);
      if (!preferences.emailOnAnnouncement) {
        this.logger.log(
          `Skipping announcement email for user ${enrollment.userId} - preference disabled`,
        );
        continue;
      }
      const templateData: EmailTemplateData = {
        userName:
          `${enrollment.user.firstName || ''} ${enrollment.user.lastName || ''}`.trim() ||
          enrollment.user.email,
        courseTitle: enrollment.course.title,
        announcementTitle,
        announcementContent,
        language: enrollment.user.language,
      };
      const { subject, html, text } =
        EmailTemplates.generateAnnouncementEmail(templateData);
      await this.sendEmail({
        to: enrollment.user.email,
        subject,
        html,
        text,
      });
      await this.logNotification(enrollment.userId, 'announcement', subject, html);
    }
  }

  /**
   * Send team invitation email
   * Requirements: 22.3
   */
  async sendTeamInvitationEmail(
    userId: string,
    courseId: string,
    teamMemberId: string,
    role: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    const acceptanceLink = `${process.env.APP_URL || 'http://localhost:3000'}/api/cms/courses/${courseId}/team/${teamMemberId}/accept`;
    const templateData: EmailTemplateData = {
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      courseTitle: course.title,
      teamRole: role,
      acceptanceLink,
      language: user.language,
    };
    const { subject, html, text } =
      EmailTemplates.generateTeamInvitationEmail(templateData);
    await this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
    await this.logNotification(userId, 'team_invitation', subject, html);
  }

  /**
   * Process bulk email synchronously (called by queue processor)
   * Requirements: 17.8
   */
  async processBulkEmailSync(
    userIds: string[],
    emailSubject: string,
    emailContent: string,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });
    for (const user of users) {
      try {
        await this.sendEmail({
          to: user.email,
          subject: emailSubject,
          html: emailContent,
        });
        await this.logNotification(user.id, 'bulk_email', emailSubject, emailContent);
      } catch (error) {
        this.logger.error(`Failed to send bulk email to ${user.email}:`, error);
      }
    }
  }

  /**
   * Get user notification preferences
   * Requirements: 17.6
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferenceResponseDto> {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailOnEnrollment: true,
          emailOnCoursePublished: true,
          emailOnCertificate: true,
          emailOnQuizReminder: true,
          emailOnAnnouncement: true,
        },
      });
    }
    return this.mapToPreferenceResponse(preferences);
  }

  /**
   * Update user notification preferences
   * Requirements: 17.6
   */
  async updateUserPreferences(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailOnEnrollment: dto.emailOnEnrollment ?? true,
          emailOnCoursePublished: dto.emailOnCoursePublished ?? true,
          emailOnCertificate: dto.emailOnCertificate ?? true,
          emailOnQuizReminder: dto.emailOnQuizReminder ?? true,
          emailOnAnnouncement: dto.emailOnAnnouncement ?? true,
        },
      });
    } else {
      preferences = await this.prisma.notificationPreference.update({
        where: { userId },
        data: dto,
      });
    }
    return this.mapToPreferenceResponse(preferences);
  }

  /**
   * Get notification logs for user
   * Requirements: 17.7
   */
  async getUserNotificationLogs(userId: string): Promise<NotificationLogResponseDto[]> {
    const logs = await this.prisma.notificationLog.findMany({
      where: { userId },
      orderBy: {
        sentAt: 'desc',
      },
      take: 50,
    });
    return logs.map((log) => this.mapToLogResponse(log));
  }

  /**
   * Send email using NodeMailer
   * Requirements: 17.5, 17.7
   */
  private async sendEmail(config: EmailConfig): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@lms.com',
        to: config.to,
        subject: config.subject,
        html: config.html,
        text: config.text,
      });
      this.logger.log(`Email sent successfully to ${config.to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${config.to}:`, error);
      throw error;
    }
  }

  /**
   * Log notification to database
   * Requirements: 17.7
   */
  private async logNotification(
    userId: string,
    type: string,
    subject: string,
    content: string,
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId,
          type,
          subject,
          content,
          deliveryStatus: 'sent',
        },
      });
    } catch (error) {
      this.logger.error('Failed to log notification:', error);
    }
  }

  /**
   * Map preference to response DTO
   */
  private mapToPreferenceResponse(preference: any): NotificationPreferenceResponseDto {
    return {
      id: preference.id,
      userId: preference.userId,
      emailOnEnrollment: preference.emailOnEnrollment,
      emailOnCoursePublished: preference.emailOnCoursePublished,
      emailOnCertificate: preference.emailOnCertificate,
      emailOnQuizReminder: preference.emailOnQuizReminder,
      emailOnAnnouncement: preference.emailOnAnnouncement,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }

  /**
   * Map log to response DTO
   */
  private mapToLogResponse(log: any): NotificationLogResponseDto {
    return {
      id: log.id,
      userId: log.userId,
      type: log.type,
      subject: log.subject,
      content: log.content,
      sentAt: log.sentAt,
      deliveryStatus: log.deliveryStatus,
    };
  }
}
