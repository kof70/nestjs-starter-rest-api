import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import { AuthPrismaService } from './services/auth-prisma.service';
import { AuthPrismaController } from './controllers/auth-prisma.controller';
import { JwtPrismaStrategy } from './strategies/jwt-prisma.strategy';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { AuditLogService } from './services/audit-log.service';
import { getI18nConfig } from '../shared/i18n/i18n.config';

@Module({
  imports: [
    ConfigModule,
    I18nModule.forRoot(getI18nConfig()),
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt-prisma' }),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: '24h', // 24-hour expiration as per requirement 1.2
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthPrismaController],
  providers: [AuthPrismaService, JwtPrismaStrategy, AuditLogService],
  exports: [AuthPrismaService, AuditLogService],
})
export class AuthPrismaModule {}
