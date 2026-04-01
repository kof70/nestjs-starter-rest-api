/**
 * Type declarations for Express Request
 * Extends Express Request to include user property from JWT authentication
 */

import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
      firstName: string | null;
      lastName: string | null;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
