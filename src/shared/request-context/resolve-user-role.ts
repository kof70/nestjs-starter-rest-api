import { UserRole } from '@prisma/client';

import { UserAccessTokenClaims } from '../../auth/dtos/auth-token-output.dto';

/**
 * Supports both Prisma JWT (`role`) and legacy JWT (`roles[]`).
 */
export function resolveRequestUserRole(user: UserAccessTokenClaims): UserRole {
  if (user.role) {
    return user.role as UserRole;
  }
  const legacy = user.roles?.[0];
  if (legacy !== undefined) {
    return legacy as unknown as UserRole;
  }
  throw new Error('Authenticated user has no role');
}
