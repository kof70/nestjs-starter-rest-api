import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { TeamService } from './services/team.service';
import { TeamActionLogService } from './services/team-action-log.service';
import { TeamController } from './controllers/team.controller';
import { TeamPermissionGuard } from './guards/team-permission.guard';

/**
 * Team module for course collaboration
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 22.10
 */
@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [TeamController],
  providers: [TeamService, TeamActionLogService, TeamPermissionGuard],
  exports: [TeamService, TeamActionLogService, TeamPermissionGuard],
})
export class TeamModule {}
