import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * DTO for assigning a role to a user
 * Requirements: 8.2
 */
export class AssignRoleDto {
  @ApiProperty({
    description: 'User ID to assign role to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Role to assign to the user',
    enum: UserRole,
    example: UserRole.INSTRUCTOR,
  })
  @IsEnum(UserRole)
  role: UserRole;
}

/**
 * DTO for role assignment response
 * Requirements: 8.2
 */
export class AssignRoleResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Previous role',
    enum: UserRole,
    example: UserRole.LEARNER,
  })
  previousRole: UserRole;

  @ApiProperty({
    description: 'New role',
    enum: UserRole,
    example: UserRole.INSTRUCTOR,
  })
  newRole: UserRole;

  @ApiProperty({
    description: 'Timestamp of role change',
    example: '2024-03-20T14:45:00Z',
  })
  updatedAt: Date;
}
