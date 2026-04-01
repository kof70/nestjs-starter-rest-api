import { TabType } from '@prisma/client';

/**
 * Tab type definitions
 * Requirements: 20.2, 20.3
 * 
 * NOTE: TabType enum is defined in prisma/schema.prisma
 * Run 'npx prisma generate' to regenerate the Prisma client if TabType is not found
 */

export interface Tab {
  id: string;
  courseId: string;
  title: string;
  type: TabType;
  order: number;
  visible: boolean;
  content: string | null;
  externalUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_TAB_TYPES: TabType[] = [
  'COURSE_INFO' as TabType,
  'SYLLABUS' as TabType,
  'CONTENT' as TabType,
  'PROGRESS' as TabType,
  'DISCUSSION' as TabType,
];

export const CUSTOM_TAB_TYPES: TabType[] = [
  'CUSTOM_STATIC' as TabType,
  'CUSTOM_LINK' as TabType,
];
