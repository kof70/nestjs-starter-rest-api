import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

interface LogActionParams {
  courseId: string;
  userId: string;
  action: string;
  details?: string;
}

/**
 * Service for logging team member actions
 * Requirements: 22.10
 */
@Injectable()
export class TeamActionLogService {
  private readonly logger = new Logger(TeamActionLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log team member action
   * Requirements: 22.10
   */
  async logAction(params: LogActionParams): Promise<void> {
    const { courseId, userId, action, details } = params;
    try {
      this.logToConsole(courseId, userId, action, details);
      await this.updateLastActivity(courseId, userId);
    } catch (error) {
      this.handleLogError(error);
    }
  }

  private logToConsole(courseId: string, userId: string, action: string, details?: string): void {
    const detailsText = details ? `, Details: ${details}` : '';
    this.logger.log(`[Team Action] Course: ${courseId}, User: ${userId}, Action: ${action}${detailsText}`);
  }

  private async updateLastActivity(courseId: string, userId: string): Promise<void> {
    const teamMember = await this.findTeamMember(courseId, userId);
    if (teamMember) {
      await this.updateMemberActivity(teamMember.id);
    }
  }

  private async findTeamMember(courseId: string, userId: string) {
    return this.prisma.courseTeam.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId,
        },
      },
    });
  }

  private async updateMemberActivity(memberId: string): Promise<void> {
    await this.prisma.courseTeam.update({
      where: { id: memberId },
      data: { lastActivityAt: new Date() },
    });
  }

  private handleLogError(error: any): void {
    this.logger.error(`Failed to log team action: ${error.message}`);
  }
}

