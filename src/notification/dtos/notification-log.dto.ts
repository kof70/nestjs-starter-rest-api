/**
 * DTO for notification log response
 * Requirements: 17.7
 */
export class NotificationLogResponseDto {
  id: string;
  userId: string;
  type: string;
  subject: string;
  content: string;
  sentAt: Date;
  deliveryStatus: string;
}
