/**
 * Certificate response DTO
 * Requirements: 7.2, 7.5
 */
export interface CertificateResponseDto {
  id: string;
  certificateId: string;
  userId: string;
  courseId: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  pdfUrl?: string;
}

/**
 * Public certificate verification response DTO
 * Requirements: 7.5
 */
export interface CertificateVerificationDto {
  certificateId: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  valid: boolean;
}
