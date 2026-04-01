import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required team role for endpoint
 * Requirements: 22.5, 22.6
 */
export const TeamRole = (role: 'OWNER' | 'EDITOR' | 'VIEWER') =>
  SetMetadata('teamRole', role);
