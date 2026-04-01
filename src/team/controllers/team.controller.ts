import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TeamService } from '../services/team.service';
import { NotificationService } from '../../notification/services/notification.service';
import { InviteTeamMemberDto } from '../dtos/invite-team-member.dto';
import { UpdateTeamMemberDto } from '../dtos/update-team-member.dto';
import { TeamMemberResponseDto } from '../dtos/team-member-response.dto';

/**
 * Controller for course team management
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.9
 */
@ApiTags('Team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cms/courses/:courseId/team')
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Invite team member to course
   * Requirements: 22.1, 22.2, 22.3
   */
  @Post()
  @ApiOperation({ summary: 'Invite team member to course' })
  @ApiResponse({
    status: 201,
    description: 'Team member invited successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Only course owner can invite' })
  @ApiResponse({ status: 404, description: 'User or course not found' })
  async inviteTeamMember(
    @Param('courseId') courseId: string,
    @Body() dto: InviteTeamMemberDto,
    @Request() req: any,
  ): Promise<TeamMemberResponseDto> {
    const teamMember = await this.teamService.inviteTeamMember(
      courseId,
      dto,
      req.user.userId,
    );
    await this.sendInvitationEmail(teamMember);
    return teamMember;
  }

  /**
   * Get team members for course
   * Requirements: 22.9
   */
  @Get()
  @ApiOperation({ summary: 'Get team members for course' })
  @ApiResponse({
    status: 200,
    description: 'Team members retrieved successfully',
    type: [TeamMemberResponseDto],
  })
  async getTeamMembers(
    @Param('courseId') courseId: string,
  ): Promise<TeamMemberResponseDto[]> {
    return this.teamService.getTeamMembers(courseId);
  }

  /**
   * Update team member role
   * Requirements: 22.5, 22.6
   */
  @Patch(':teamMemberId')
  @ApiOperation({ summary: 'Update team member role' })
  @ApiResponse({
    status: 200,
    description: 'Team member role updated successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Only course owner can update' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  async updateTeamMemberRole(
    @Param('teamMemberId') teamMemberId: string,
    @Body() dto: UpdateTeamMemberDto,
    @Request() req: any,
  ): Promise<TeamMemberResponseDto> {
    return this.teamService.updateTeamMemberRole(
      teamMemberId,
      dto,
      req.user.userId,
    );
  }

  /**
   * Remove team member from course
   * Requirements: 22.7, 22.8
   */
  @Delete(':teamMemberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove team member from course' })
  @ApiResponse({ status: 204, description: 'Team member removed successfully' })
  @ApiResponse({ status: 403, description: 'Only course owner can remove' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  async removeTeamMember(
    @Param('teamMemberId') teamMemberId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.teamService.removeTeamMember(teamMemberId, req.user.userId);
  }

  /**
   * Accept team invitation
   * Requirements: 22.4
   */
  @Post(':teamMemberId/accept')
  @ApiOperation({ summary: 'Accept team invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Cannot accept for another user' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async acceptInvitation(
    @Param('teamMemberId') teamMemberId: string,
    @Request() req: any,
  ): Promise<TeamMemberResponseDto> {
    return this.teamService.acceptInvitation(teamMemberId, req.user.userId);
  }

  /**
   * Send invitation email
   * Requirements: 22.3
   */
  private async sendInvitationEmail(
    teamMember: TeamMemberResponseDto,
  ): Promise<void> {
    try {
      await this.notificationService.sendTeamInvitationEmail(
        teamMember.userId,
        teamMember.courseId,
        teamMember.id,
        teamMember.role,
      );
    } catch (error) {
      console.error('Failed to send invitation email:', error);
    }
  }
}
