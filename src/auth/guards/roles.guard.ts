import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles-prisma.decorator';
import { AuditLogService } from '../services/audit-log.service';

/**
 * Guard for role-based authorization
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { user } = request;

    // User should be attached by JwtAuthGuard
    if (!user) {
      return false;
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.includes(user.role as UserRole);

    if (hasRole) {
      return true;
    }

    try {
      await this.auditLogService.logPermissionViolation({
        userId: user.id,
        email: user.email,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers['user-agent'],
        attemptedAction: `${request.method} ${request.path}`,
        requiredRoles: requiredRoles,
        userRole: user.role,
        resourceId: request.params?.id,
      });
    } catch {
      // Audit failure must not block the 403 response
    }

    // Throw 403 Forbidden as per requirement 8.5
    throw new ForbiddenException(
      `User with role ${user.role} does not have access to this resource. Required roles: ${requiredRoles.join(', ')}`,
    );
  }
}
