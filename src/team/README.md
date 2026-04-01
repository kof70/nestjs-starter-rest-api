# Team Collaboration Module

This module implements collaborative course management with role-based permissions.

## Requirements

Implements requirements 22.1-22.11 from the specification.

## Team Roles

### OWNER
- Full control over the course
- Can manage team members (invite, remove, change roles)
- Can modify all course content
- Cannot remove themselves unless another owner exists

### EDITOR
- Can modify course content (modules, content items, quizzes)
- **Cannot** manage team members
- **Cannot** change course ownership
- Full access to course editing features

### VIEWER
- Read-only access to course content
- Can view course analytics and reports
- **Cannot** modify any content
- **Cannot** manage team members

## Permission Enforcement

### Using the TeamPermissionGuard

The `TeamPermissionGuard` enforces team permissions on course endpoints:

```typescript
@UseGuards(JwtAuthGuard, TeamPermissionGuard)
@TeamRole('EDITOR')  // Requires EDITOR or higher
@Patch(':id')
async updateCourse(@Param('id') id: string) {
  // Only course owner, editors, or admins can access
}
```

### Permission Hierarchy

```
OWNER (3) > EDITOR (2) > VIEWER (1)
```

A user with OWNER role can access endpoints requiring EDITOR or VIEWER.
A user with EDITOR role can access endpoints requiring VIEWER.

### Admin Override

Users with `UserRole.ADMIN` bypass all team permission checks.

## Action Logging

All team member actions are logged with:
- Course ID
- User ID
- Action type (created, updated, deleted)
- Timestamp
- Resource type (module, content, course)

### Using the TeamActionLogInterceptor

Apply to controllers that modify course content:

```typescript
@UseInterceptors(TeamActionLogInterceptor)
@Controller('cms/courses')
export class CourseController {
  // All POST, PATCH, PUT, DELETE actions will be logged
}
```

### Manual Logging

For custom logging:

```typescript
await this.actionLogService.logAction({
  courseId: 'course-id',
  userId: 'user-id',
  action: 'published course',
  details: 'Optional details',
});
```

## Last Activity Tracking

The guard automatically updates `lastActivityAt` timestamp for team members on every request.

## API Endpoints

### POST /cms/courses/:courseId/team
Invite team member (Owner only)

### GET /cms/courses/:courseId/team
List team members

### PATCH /cms/courses/:courseId/team/:teamMemberId
Update team member role (Owner only)

### DELETE /cms/courses/:courseId/team/:teamMemberId
Remove team member (Owner only)

### POST /cms/courses/:courseId/team/:teamMemberId/accept
Accept team invitation

## Integration with Course Module

To protect course endpoints, import TeamModule and apply guards:

```typescript
@Module({
  imports: [TeamModule],
  // ...
})
export class CourseModule {}
```

Then in controllers:

```typescript
@UseGuards(JwtAuthGuard, TeamPermissionGuard)
@TeamRole('EDITOR')  // Specify minimum required role
export class CourseController {
  // Protected endpoints
}
```

## Testing

Run team module tests:

```bash
npm test -- team
```

## Notes

- Course owners are automatically granted OWNER role
- Team members must accept invitations before gaining access
- Removing the last owner is prevented
- All permission violations are logged
- Action logs are currently console-based (can be extended to database)
