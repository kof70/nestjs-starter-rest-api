import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating team member role
 * Requirements: 22.5, 22.6
 */
export class UpdateTeamMemberDto {
  @ApiProperty({
    description: 'New role to assign (EDITOR or VIEWER)',
    enum: ['EDITOR', 'VIEWER'],
    example: 'VIEWER',
  })
  @IsEnum(['EDITOR', 'VIEWER'], {
    message: 'Role must be either EDITOR or VIEWER',
  })
  role: 'EDITOR' | 'VIEWER';
}
