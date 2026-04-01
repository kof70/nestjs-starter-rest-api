import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { InviteTeamMemberDto } from '../dtos/invite-team-member.dto';
import { UpdateTeamMemberDto } from '../dtos/update-team-member.dto';
import { TeamMemberResponseDto } from '../dtos/team-member-response.dto';
import { TeamRole } from '@prisma/client';

/**
 * Service for managing course team collaboration
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 22.10
 */
@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invite team member to course
   * Requirements: 22.1, 22.2, 22.3
   */
  async inviteTeamMember(
    courseId: string,
    dto: InviteTeamMemberDto,
    inviterId: string,
  ): Promise<TeamMemberResponseDto> {
    await this.validateCourseOwnership(courseId, inviterId);
    const user = await this.findUserByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }
    const existingMember = await this.prisma.courseTeam.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId: user.id,
        },
      },
    });
    if (existingMember) {
      throw new BadRequestException('User is already a team member');
    }
    const teamMember = await this.prisma.courseTeam.create({
      data: {
        courseId,
        userId: user.id,
        role: dto.role as TeamRole,
        invitationAccepted: false,
      },
      include: {
        user: true,
      },
    });
    this.logger.log(
      `Team member invited: ${user.email} as ${dto.role} for course ${courseId}`,
    );
    return this.mapToResponse(teamMember);
  }

  /**
   * Accept team invitation
   * Requirements: 22.4
   */
  async acceptInvitation(
    teamMemberId: string,
    userId: string,
  ): Promise<TeamMemberResponseDto> {
    const teamMember = await this.prisma.courseTeam.findUnique({
      where: { id: teamMemberId },
      include: { user: true },
    });
    if (!teamMember) {
      throw new NotFoundException('Team invitation not found');
    }
    if (teamMember.userId !== userId) {
      throw new ForbiddenException('Cannot accept invitation for another user');
    }
    if (teamMember.invitationAccepted) {
      throw new BadRequestException('Invitation already accepted');
    }
    const updated = await this.prisma.courseTeam.update({
      where: { id: teamMemberId },
      data: {
        invitationAccepted: true,
        acceptedAt: new Date(),
      },
      include: { user: true },
    });
    this.logger.log(
      `Team invitation accepted: ${teamMember.user.email} for course ${teamMember.courseId}`,
    );
    return this.mapToResponse(updated);
  }

  /**
   * Get team members for course
   * Requirements: 22.9
   */
  async getTeamMembers(courseId: string): Promise<TeamMemberResponseDto[]> {
    const members = await this.prisma.courseTeam.findMany({
      where: { courseId },
      include: { user: true },
      orderBy: { invitedAt: 'desc' },
    });
    return members.map((member) => this.mapToResponse(member));
  }

  /**
   * Update team member role
   * Requirements: 22.5, 22.6
   */
  async updateTeamMemberRole(
    teamMemberId: string,
    dto: UpdateTeamMemberDto,
    requesterId: string,
  ): Promise<TeamMemberResponseDto> {
    const teamMember = await this.prisma.courseTeam.findUnique({
      where: { id: teamMemberId },
      include: { user: true },
    });
    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }
    await this.validateCourseOwnership(teamMember.courseId, requesterId);
    if (teamMember.role === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot change role of course owner');
    }
    const updated = await this.prisma.courseTeam.update({
      where: { id: teamMemberId },
      data: { role: dto.role as TeamRole },
      include: { user: true },
    });
    this.logger.log(
      `Team member role updated: ${teamMember.user.email} to ${dto.role}`,
    );
    return this.mapToResponse(updated);
  }

  /**
   * Remove team member from course
   * Requirements: 22.7, 22.8
   */
  async removeTeamMember(
    teamMemberId: string,
    requesterId: string,
  ): Promise<void> {
    const teamMember = await this.prisma.courseTeam.findUnique({
      where: { id: teamMemberId },
      include: { user: true },
    });
    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }
    await this.validateCourseOwnership(teamMember.courseId, requesterId);
    if (teamMember.role === TeamRole.OWNER && teamMember.userId === requesterId) {
      const ownerCount = await this.prisma.courseTeam.count({
        where: {
          courseId: teamMember.courseId,
          role: TeamRole.OWNER,
        },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot remove yourself as owner unless another owner exists',
        );
      }
    }
    await this.prisma.courseTeam.delete({
      where: { id: teamMemberId },
    });
    this.logger.log(
      `Team member removed: ${teamMember.user.email} from course ${teamMember.courseId}`,
    );
  }

  /**
   * Check if user has permission for course
   * Requirements: 22.5, 22.6
   */
  async hasPermission(
    courseId: string,
    userId: string,
    requiredRole: 'OWNER' | 'EDITOR' | 'VIEWER',
  ): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      return false;
    }
    if (course.ownerId === userId) {
      return true;
    }
    const teamMember = await this.prisma.courseTeam.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId,
        },
      },
    });
    if (!teamMember || !teamMember.invitationAccepted) {
      return false;
    }
    const roleHierarchy = {
      OWNER: 3,
      EDITOR: 2,
      VIEWER: 1,
    };
    return roleHierarchy[teamMember.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Update last activity timestamp
   * Requirements: 22.9, 22.10
   */
  async updateLastActivity(courseId: string, userId: string): Promise<void> {
    const teamMember = await this.prisma.courseTeam.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId,
        },
      },
    });
    if (teamMember) {
      await this.prisma.courseTeam.update({
        where: { id: teamMember.id },
        data: { lastActivityAt: new Date() },
      });
    }
  }

  /**
   * Validate course ownership
   * Requirements: 22.1
   */
  private async validateCourseOwnership(
    courseId: string,
    userId: string,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (course.ownerId !== userId) {
      throw new ForbiddenException('Only course owner can manage team members');
    }
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Map team member to response DTO
   */
  private mapToResponse(teamMember: any): TeamMemberResponseDto {
    return {
      id: teamMember.id,
      courseId: teamMember.courseId,
      userId: teamMember.userId,
      userEmail: teamMember.user.email,
      userName:
        `${teamMember.user.firstName || ''} ${teamMember.user.lastName || ''}`.trim() ||
        teamMember.user.email,
      role: teamMember.role,
      invitationAccepted: teamMember.invitationAccepted,
      invitedAt: teamMember.invitedAt,
      acceptedAt: teamMember.acceptedAt,
      lastActivityAt: teamMember.lastActivityAt,
    };
  }
}
