import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthPrismaService } from '../services/auth-prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  language?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtPrismaStrategy extends PassportStrategy(Strategy, 'jwt-prisma') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  /**
   * Validate JWT token and return user
   * Requirements: 1.4
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      language: user.language,
    };
  }
}
