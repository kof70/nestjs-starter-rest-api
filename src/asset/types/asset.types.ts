/**
 * Asset type definitions
 */

export interface Asset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  courseId: string;
  contentItemId: string | null;
  uploaderId: string;
  usageCount: number;
  createdAt: Date;
}

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}
