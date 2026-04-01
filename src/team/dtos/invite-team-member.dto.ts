import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamRole } from '@prisma/client';

/**
 * DTO for inviting team members
 * Requirements: 22.1, 22.2
 */
export class InviteTeamMemberDto {
  @ApiProperty({
    description: 'Email of the user to invite',
    example: 'instructor@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign (EDITOR or VIEWER)',
    enum: ['EDITOR', 'VIEWER'],
    example: 'EDITOR',
  })
  @IsEnum(['EDITOR', 'VIEWER'], {
    message: 'Role must be either EDITOR or VIEWER',
  })
  role: 'EDITOR' | 'VIEWER';
}
