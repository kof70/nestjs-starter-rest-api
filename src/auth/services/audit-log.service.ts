import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface AuthAttemptLog {
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

export interface PermissionViolationLog {
  userId: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  attemptedAction: string;
  requiredRoles: string[];
  userRole: string;
  resourceId?: string;
}

/**
 * Service for audit logging of authentication and authorization events
 * Requirements: 8.6, 11.3, 11.4
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log authentication attempt
   * Requirements: 11.3
   */
  async logAuthAttempt(log: AuthAttemptLog): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId: log.userId || 'unknown',
          type: 'AUTH_ATTEMPT',
          subject: log.success ? 'Login Success' : 'Login Failed',
          content: JSON.stringify({
            email: log.email,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            success: log.success,
            failureReason: log.failureReason,
            timestamp: new Date().toISOString(),
          }),
          deliveryStatus: 'logged',
        },
      });
    } catch (error) {
      // Log to console if database logging fails
      console.error('Failed to log auth attempt:', error);
    }
  }

  /**
   * Log permission violation
   * Requirements: 8.6, 11.4
   */
  async logPermissionViolation(log: PermissionViolationLog): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId: log.userId,
          type: 'PERMISSION_VIOLATION',
          subject: 'Unauthorized Access Attempt',
          content: JSON.stringify({
            email: log.email,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            attemptedAction: log.attemptedAction,
            requiredRoles: log.requiredRoles,
            userRole: log.userRole,
            resourceId: log.resourceId,
            timestamp: new Date().toISOString(),
          }),
          deliveryStatus: 'logged',
        },
      });
    } catch (error) {
      // Log to console if database logging fails
      console.error('Failed to log permission violation:', error);
    }
  }
}
