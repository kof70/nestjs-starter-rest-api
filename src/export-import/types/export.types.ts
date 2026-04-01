import {
  ContentType,
  CourseStatus,
  Language,
  TabType,
} from '@prisma/client';

/**
 * Exported course structure
 * Requirements: 16.2, 16.3
 */
export interface ExportedCourse {
  version: string;
  exportedAt: string;
  course: ExportedCourseMetadata;
  modules: ExportedModule[];
  tabs: ExportedTab[];
}

export interface ExportedCourseMetadata {
  title: string;
  description: string | null;
  language: Language;
  status: CourseStatus;
  enrollmentStart: string | null;
  enrollmentEnd: string | null;
  courseStart: string | null;
  courseEnd: string | null;
}

export interface ExportedModule {
  title: string;
  description: string | null;
  order: number;
  prerequisiteOrder: number | null;
  contentItems: ExportedContentItem[];
}

export interface ExportedContentItem {
  title: string;
  type: ContentType;
  order: number;
  mandatory: boolean;
  textContent: string | null;
  videoUrl: string | null;
  videoEmbedCode: string | null;
  documentUrl: string | null;
  quiz: ExportedQuiz | null;
  video: ExportedVideo | null;
}

export interface ExportedQuiz {
  passingScore: number;
  maxAttempts: number;
  questions: ExportedQuestion[];
}

export interface ExportedQuestion {
  questionText: string;
  order: number;
  options: ExportedQuestionOption[];
}

export interface ExportedQuestionOption {
  optionText: string;
  isCorrect: boolean;
  order: number;
}

export interface ExportedVideo {
  title: string;
  description: string | null;
  duration: number | null;
  format: string | null;
  thumbnailUrl: string | null;
  youtubeUrl: string | null;
}

export interface ExportedTab {
  title: string;
  type: TabType;
  order: number;
  visible: boolean;
  content: string | null;
  externalUrl: string | null;
}
