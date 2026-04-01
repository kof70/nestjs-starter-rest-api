import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Reads `request.user` (JWT payload). Pass a property key to pick one field.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: Record<string, unknown> }>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    if (data === undefined || data === '') {
      return user;
    }
    return user[data];
  },
);
