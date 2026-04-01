/**
 * Response DTO for content item progress
 */
export interface ContentProgressResponseDto {
  userId: string;
  contentItemId: string;
  completed: boolean;
  timeSpent: number;
  completedAt: Date | null;
}

/**
 * Response DTO for module progress
 */
export interface ModuleProgressResponseDto {
  moduleId: string;
  completed: boolean;
  completionPercentage: number;
  totalItems: number;
  completedItems: number;
}

/**
 * Response DTO for course progress
 */
export interface CourseProgressResponseDto {
  courseId: string;
  completed: boolean;
  completionPercentage: number;
  totalItems: number;
  completedItems: number;
}

/**
 * Response DTO for progress dashboard
 */
export interface ProgressDashboardResponseDto {
  courseId: string;
  courseTitle: string;
  enrolledAt: Date;
  completionPercentage: number;
  completed: boolean;
  totalItems: number;
  completedItems: number;
  timeSpent: number;
  estimatedTimeRemaining: number;
}
