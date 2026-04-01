/**
 * Type definitions for video module
 * Requirements: 19.1, 19.2
 */

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface Video {
  id: string;
  contentItemId: string;
  title: string;
  description: string | null;
  duration: number | null;
  format: string | null;
  thumbnailUrl: string | null;
  youtubeUrl: string | null;
  uploadUrl: string | null;
  uploaderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
}
