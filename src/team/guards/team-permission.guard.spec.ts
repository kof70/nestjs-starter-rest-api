import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamPermissionGuard } from './team-permission.guard';
import { TeamService } from '../services/team.service';
import { UserRole } from '@prisma/client';

describe('TeamPermissionGuard', () => {
  let guard: TeamPermissionGuard;
  let mockTeamService: jest.Mocked<TeamService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    mockTeamService = {
      hasPermission: jest.fn(),
      updateLastActivity: jest.fn(),
    } as any;

    mockReflector = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamPermissionGuard,
        { provide: TeamService, useValue: mockTeamService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<TeamPermissionGuard>(TeamPermissionGuard);
  });

  const createMockContext = (user: any, params: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          route: { path: '/cms/courses/:id' },
        }),
      }),
      getHandler: () => ({}),
    } as any;
  };

  describe('canActivate', () => {
    it('should throw ForbiddenException when user is not authenticated', async () => {
      const mockContext = createMockContext(null);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access for admin users', async () => {
      const mockUser = { userId: 'user-1', role: UserRole.ADMIN };
      const mockContext = createMockContext(mockUser, { courseId: 'course-1' });
      const actualResult = await guard.canActivate(mockContext);
      expect(actualResult).toBe(true);
      expect(mockTeamService.hasPermission).not.toHaveBeenCalled();
    });

    it('should check permission for non-admin users', async () => {
      const mockUser = { userId: 'user-1', role: UserRole.INSTRUCTOR };
      const mockContext = createMockContext(mockUser, { courseId: 'course-1' });
      mockReflector.get.mockReturnValue('EDITOR');
      mockTeamService.hasPermission.mockResolvedValue(true);
      const actualResult = await guard.canActivate(mockContext);
      expect(actualResult).toBe(true);
      expect(mockTeamService.hasPermission).toHaveBeenCalledWith(
        'course-1',
        'user-1',
        'EDITOR',
      );
      expect(mockTeamService.updateLastActivity).toHaveBeenCalledWith(
        'course-1',
        'user-1',
      );
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      const mockUser = { userId: 'user-1', role: UserRole.INSTRUCTOR };
      const mockContext = createMockContext(mockUser, { courseId: 'course-1' });
      mockReflector.get.mockReturnValue('EDITOR');
      mockTeamService.hasPermission.mockResolvedValue(false);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access when no courseId in params', async () => {
      const mockUser = { userId: 'user-1', role: UserRole.INSTRUCTOR };
      const mockContext = createMockContext(mockUser, {});
      const actualResult = await guard.canActivate(mockContext);
      expect(actualResult).toBe(true);
      expect(mockTeamService.hasPermission).not.toHaveBeenCalled();
    });

    it('should use VIEWER as default required role', async () => {
      const mockUser = { userId: 'user-1', role: UserRole.INSTRUCTOR };
      const mockContext = createMockContext(mockUser, { courseId: 'course-1' });
      mockReflector.get.mockReturnValue(undefined);
      mockTeamService.hasPermission.mockResolvedValue(true);
      await guard.canActivate(mockContext);
      expect(mockTeamService.hasPermission).toHaveBeenCalledWith(
        'course-1',
        'user-1',
        'VIEWER',
      );
    });
  });
});
