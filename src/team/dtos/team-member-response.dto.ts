import { ApiProperty } from '@nestjs/swagger';
import { TeamRole } from '@prisma/client';

/**
 * DTO for team member response
 * Requirements: 22.9
 */
export class TeamMemberResponseDto {
  @ApiProperty({
    description: 'Team member ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  courseId: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'instructor@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'Team role',
    enum: TeamRole,
    example: 'EDITOR',
  })
  role: TeamRole;

  @ApiProperty({
    description: 'Whether invitation has been accepted',
    example: true,
  })
  invitationAccepted: boolean;

  @ApiProperty({
    description: 'Invitation date',
    example: '2024-01-15T10:00:00Z',
  })
  invitedAt: Date;

  @ApiProperty({
    description: 'Acceptance date',
    example: '2024-01-16T14:30:00Z',
    nullable: true,
  })
  acceptedAt: Date | null;

  @ApiProperty({
    description: 'Last activity date',
    example: '2024-01-20T09:15:00Z',
    nullable: true,
  })
  lastActivityAt: Date | null;
}
