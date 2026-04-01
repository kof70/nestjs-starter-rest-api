import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamService } from '../services/team.service';
import { UserRole } from '@prisma/client';

interface RequestUser {
  userId?: string;
  id?: string;
  role?: UserRole;
  roles?: UserRole[];
}

interface AuthenticatedRequest {
  user: RequestUser;
  params: Record<string, string>;
  route: { path: string };
}

/**
 * Guard to enforce team permissions on course endpoints
 * Requirements: 22.5, 22.6, 22.10
 */
@Injectable()
export class TeamPermissionGuard implements CanActivate {
  private readonly logger = new Logger(TeamPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    const userId = this.extractUserId(user);
    const userRole = this.extractUserRole(user);
    if (this.isAdmin(userRole)) {
      return true;
    }
    const courseId = this.extractCourseId(request);
    if (!courseId) {
      return true;
    }
    const requiredRole = this.getRequiredRole(context);
    const hasPermission = await this.checkPermission(courseId, userId, requiredRole);
    if (!hasPermission) {
      this.logAccessDenied(userId, courseId, requiredRole);
      throw new ForbiddenException('You do not have permission to perform this action on this course');
    }
    await this.updateActivity(courseId, userId);
    return true;
  }

  private extractUserId(user: RequestUser): string {
    return String(user.userId || user.id);
  }

  private extractUserRole(user: RequestUser): UserRole {
    return user.role || user.roles?.[0] || UserRole.LEARNER;
  }

  private isAdmin(role: UserRole): boolean {
    return role === UserRole.ADMIN;
  }

  private extractCourseId(request: AuthenticatedRequest): string | null {
    if (request.params?.courseId) {
      return request.params.courseId;
    }
    if (request.params?.id && request.route?.path?.includes('courses')) {
      return request.params.id;
    }
    return null;
  }

  private getRequiredRole(context: ExecutionContext): 'OWNER' | 'EDITOR' | 'VIEWER' {
    const requiredRole = this.reflector.get<'OWNER' | 'EDITOR' | 'VIEWER'>('teamRole', context.getHandler());
    return requiredRole || 'VIEWER';
  }

  private async checkPermission(courseId: string, userId: string, role: 'OWNER' | 'EDITOR' | 'VIEWER'): Promise<boolean> {
    return this.teamService.hasPermission(courseId, userId, role);
  }

  private logAccessDenied(userId: string, courseId: string, role: string): void {
    this.logger.warn(`User ${userId} denied access to course ${courseId} (required: ${role})`);
  }

  private async updateActivity(courseId: string, userId: string): Promise<void> {
    await this.teamService.updateLastActivity(courseId, userId);
  }
}

