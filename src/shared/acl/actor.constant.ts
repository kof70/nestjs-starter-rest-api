import { ROLE } from './../../auth/constants/role.constant';

/**
 * The actor who is perfoming the action
 */
export interface Actor {
  id: number | string;

  /** Legacy JWT: list of roles */
  roles?: string[];

  /** Prisma JWT: single role */
  role?: string;
}
