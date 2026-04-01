/**
 * Email template types
 * Requirements: 17.5
 */
export enum EmailTemplateType {
  WELCOME = 'welcome',
  COURSE_PUBLISHED = 'course_published',
  CERTIFICATE = 'certificate',
  QUIZ_REMINDER = 'quiz_reminder',
  ANNOUNCEMENT = 'announcement',
  TEAM_INVITATION = 'team_invitation',
}

/**
 * Email template data interface
 */
export interface EmailTemplateData {
  userName: string;
  courseTitle?: string;
  certificateId?: string;
  quizTitle?: string;
  quizDeadline?: Date;
  announcementTitle?: string;
  announcementContent?: string;
  teamRole?: string;
  acceptanceLink?: string;
  language?: string;
}

/**
 * Email configuration interface
 */
export interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
