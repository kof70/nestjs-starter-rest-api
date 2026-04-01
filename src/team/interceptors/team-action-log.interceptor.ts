import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TeamActionLogService } from '../services/team-action-log.service';

/**
 * Interceptor to log team member actions
 * Requirements: 22.10
 */
@Injectable()
export class TeamActionLogInterceptor implements NestInterceptor {
  constructor(private readonly actionLogService: TeamActionLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const path = request.route?.path || request.url;
    if (!user || !this.shouldLog(method)) {
      return next.handle();
    }
    const userId = String(user.userId || user.id);
    const courseId = this.extractCourseId(request);
    if (!courseId) {
      return next.handle();
    }
    const action = this.buildActionDescription(method, path);
    return next.handle().pipe(
      tap(() => {
        this.logAction(courseId, userId, action);
      }),
    );
  }

  private shouldLog(method: string): boolean {
    return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  }

  private extractCourseId(request: any): string | null {
    return request.params?.courseId || request.params?.id || null;
  }

  private buildActionDescription(method: string, path: string): string {
    const actionMap: Record<string, string> = {
      POST: 'created',
      PATCH: 'updated',
      PUT: 'updated',
      DELETE: 'deleted',
    };
    const action = actionMap[method] || 'modified';
    const resource = this.extractResource(path);
    return `${action} ${resource}`;
  }

  private extractResource(path: string): string {
    if (path.includes('modules')) return 'module';
    if (path.includes('content')) return 'content';
    if (path.includes('publish')) return 'course (published)';
    if (path.includes('archive')) return 'course (archived)';
    return 'course';
  }

  private async logAction(courseId: string, userId: string, action: string): Promise<void> {
    try {
      await this.actionLogService.logAction({ courseId, userId, action });
    } catch (error) {
      // Silently fail to not disrupt the request
    }
  }
}
