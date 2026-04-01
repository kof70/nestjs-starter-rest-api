import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

type NotificationAuthedRequest = Request & {
  user: { id: string };
};
import { NotificationService } from '../services/notification.service';
import {
  UpdateNotificationPreferenceDto,
  NotificationPreferenceResponseDto,
} from '../dtos/notification-preference.dto';
import { NotificationLogResponseDto } from '../dtos/notification-log.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Notification controller for managing notification preferences
 * Requirements: 17.6, 17.7
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get current user's notification preferences
   * Requirements: 17.6
   */
  @Get('preferences')
  async getPreferences(
    @Req() req: NotificationAuthedRequest,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.notificationService.getUserPreferences(req.user.id);
  }

  /**
   * Update current user's notification preferences
   * Requirements: 17.6
   */
  @Patch('preferences')
  async updatePreferences(
    @Req() req: NotificationAuthedRequest,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.notificationService.updateUserPreferences(req.user.id, dto);
  }

  /**
   * Get current user's notification logs
   * Requirements: 17.7
   */
  @Get('logs')
  async getLogs(@Req() req: NotificationAuthedRequest): Promise<NotificationLogResponseDto[]> {
    return this.notificationService.getUserNotificationLogs(req.user.id);
  }
}
