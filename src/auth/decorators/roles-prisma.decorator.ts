import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for an endpoint
 * Usage: @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
