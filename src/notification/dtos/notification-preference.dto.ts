import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for updating notification preferences
 * Requirements: 17.6
 */
export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  emailOnEnrollment?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOnCoursePublished?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOnCertificate?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOnQuizReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOnAnnouncement?: boolean;
}

/**
 * DTO for notification preference response
 * Requirements: 17.6
 */
export class NotificationPreferenceResponseDto {
  id: string;
  userId: string;
  emailOnEnrollment: boolean;
  emailOnCoursePublished: boolean;
  emailOnCertificate: boolean;
  emailOnQuizReminder: boolean;
  emailOnAnnouncement: boolean;
  createdAt: Date;
  updatedAt: Date;
}
