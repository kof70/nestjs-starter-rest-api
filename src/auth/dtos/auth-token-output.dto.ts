import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { ROLE } from '../constants/role.constant';

export class AuthTokenOutput {
  @Expose()
  @ApiProperty()
  accessToken: string;

  @Expose()
  @ApiProperty()
  refreshToken: string;
}

export class UserAccessTokenClaims {
  @Expose()
  id: number | string;

  @Expose()
  username?: string;

  /** Legacy TypeORM JWT (array of ROLE) */
  @Expose()
  roles?: ROLE[];

  /** Prisma JWT strategy (`JwtPrismaStrategy`) */
  @Expose()
  role?: string;

  @Expose()
  email?: string;

  @Expose()
  language?: string;

  @Expose()
  firstName?: string;

  @Expose()
  lastName?: string;
}

export class UserRefreshTokenClaims {
  id: number;
}
