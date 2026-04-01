import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { CertificateResponseDto, CertificateVerificationDto } from '../dtos/certificate-response.dto';

/**
 * Certificate service
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  private formatLearnerDisplayName(user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }): string {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return user.email;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Generate certificate for course completion
   * Requirements: 7.1, 7.2, 7.6, 7.7
   */
  async generateCertificate(
    userId: string,
    courseId: string,
  ): Promise<CertificateResponseDto> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            contentItems: {
              include: {
                quiz: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user has completed the course (100% progress)
    const courseProgress = await this.calculateCourseProgress(userId, courseId);
    if (courseProgress < 100) {
      throw new BadRequestException(
        'Certificate can only be generated after 100% course completion',
      );
    }

    // Validate passing scores for all quizzes (Requirement 7.6)
    await this.validatePassingScores(userId, course);

    // Check if certificate already exists
    const existingCertificate = await this.prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingCertificate) {
      return this.mapToCertificateResponse(existingCertificate, user, course);
    }

    // Generate unique certificate ID
    const certificateId = this.generateCertificateId();

    // Create certificate
    const certificate = await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateId,
        issuedAt: new Date(),
      },
    });
    // Send certificate notification (Requirement 17.3)
    try {
      await this.notificationService.sendCertificateEmail(userId, courseId, certificateId);
    } catch (error) {
      this.logger.error(`Failed to send certificate notification for certificate ${certificate.id}:`, error);
    }
    return this.mapToCertificateResponse(certificate, user, course);
  }

  /**
   * Get certificate by ID
   * Requirements: 7.4
   */
  async getCertificateById(certificateId: string): Promise<CertificateResponseDto> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        user: true,
        course: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return this.mapToCertificateResponse(
      certificate,
      certificate.user,
      certificate.course,
    );
  }

  /**
   * Get all certificates for a user
   * Requirements: 7.4
   */
  async getUserCertificates(userId: string): Promise<CertificateResponseDto[]> {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      include: {
        user: true,
        course: true,
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return certificates.map((cert) =>
      this.mapToCertificateResponse(cert, cert.user, cert.course),
    );
  }

  /**
   * Get certificates for a course
   * Requirements: 7.4
   */
  async getCourseCertificates(courseId: string): Promise<CertificateResponseDto[]> {
    const certificates = await this.prisma.certificate.findMany({
      where: { courseId },
      include: {
        user: true,
        course: true,
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return certificates.map((cert) =>
      this.mapToCertificateResponse(cert, cert.user, cert.course),
    );
  }

  /**
   * Verify certificate by public certificate ID
   * Requirements: 7.5
   */
  async verifyCertificate(
    certificateId: string,
  ): Promise<CertificateVerificationDto> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { certificateId },
      include: {
        user: true,
        course: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return {
      certificateId: certificate.certificateId,
      learnerName: this.formatLearnerDisplayName(certificate.user),
      courseTitle: certificate.course.title,
      issuedAt: certificate.issuedAt,
      valid: true,
    };
  }

  /**
   * Generate certificate PDF
   * Requirements: 7.3, 7.4, 7.7
   */
  async generateCertificatePDF(certificateId: string): Promise<Buffer> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        user: true,
        course: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return this.createPDFBuffer(certificate, certificate.user, certificate.course);
  }

  /**
   * Check if user can generate certificate
   * Requirements: 7.6
   */
  async canGenerateCertificate(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    try {
      // Check course completion
      const courseProgress = await this.calculateCourseProgress(userId, courseId);
      if (courseProgress < 100) {
        return false;
      }

      // Check passing scores
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: {
          modules: {
            include: {
              contentItems: {
                include: {
                  quiz: true,
                },
              },
            },
          },
        },
      });

      if (!course) {
        return false;
      }

      await this.validatePassingScores(userId, course);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate passing scores for all quizzes in course
   * Requirements: 7.6
   */
  private async validatePassingScores(userId: string, course: any): Promise<void> {
    const quizzes = [];
    for (const module of course.modules) {
      for (const contentItem of module.contentItems) {
        if (contentItem.quiz) {
          quizzes.push(contentItem.quiz);
        }
      }
    }

    // If no quizzes, no validation needed
    if (quizzes.length === 0) {
      return;
    }

    // Check each quiz for passing score
    for (const quiz of quizzes) {
      const attempts = await this.prisma.quizAttempt.findMany({
        where: {
          userId,
          quizId: quiz.id,
        },
        orderBy: {
          score: 'desc',
        },
        take: 1,
      });

      if (attempts.length === 0) {
        throw new BadRequestException(
          `Quiz "${quiz.id}" has not been attempted`,
        );
      }

      const bestAttempt = attempts[0];
      if (bestAttempt.score < quiz.passingScore) {
        throw new BadRequestException(
          `Minimum passing score not achieved for quiz "${quiz.id}". Required: ${quiz.passingScore}%, Achieved: ${bestAttempt.score}%`,
        );
      }
    }
  }

  /**
   * Calculate course progress percentage
   * Requirements: 6.3
   */
  private async calculateCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<number> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            contentItems: true,
          },
        },
      },
    });

    if (!course) {
      return 0;
    }

    let totalMandatory = 0;
    let completedMandatory = 0;

    for (const module of course.modules) {
      const mandatoryItems = module.contentItems.filter((item) => item.mandatory);
      totalMandatory += mandatoryItems.length;

      const completed = await this.prisma.progress.count({
        where: {
          userId,
          contentItemId: {
            in: mandatoryItems.map((item) => item.id),
          },
          completed: true,
        },
      });

      completedMandatory += completed;
    }

    return totalMandatory > 0 ? (completedMandatory / totalMandatory) * 100 : 100;
  }

  /**
   * Generate unique certificate ID
   * Requirements: 7.2
   */
  private generateCertificateId(): string {
    return `CERT-${uuidv4().toUpperCase().substring(0, 8)}`;
  }

  /**
   * Create PDF buffer for certificate
   * Requirements: 7.3, 7.7
   */
  private createPDFBuffer(certificate: any, user: any, course: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Determine language for template (Requirement 7.7)
        const language = course.language || 'EN';
        const isEnglish = language === 'EN';

        // Certificate border
        doc
          .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
          .lineWidth(3)
          .stroke('#2c3e50');

        doc
          .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
          .lineWidth(1)
          .stroke('#34495e');

        // Title
        doc
          .fontSize(36)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text(
            isEnglish ? 'CERTIFICATE OF COMPLETION' : 'CERTIFICAT DE RÉUSSITE',
            0,
            100,
            {
              align: 'center',
            },
          );

        // Subtitle
        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#7f8c8d')
          .text(
            isEnglish ? 'This is to certify that' : 'Ceci certifie que',
            0,
            160,
            {
              align: 'center',
            },
          );

        // Learner name
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text(this.formatLearnerDisplayName(user), 0, 200, {
            align: 'center',
          });

        // Completion text
        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#7f8c8d')
          .text(
            isEnglish
              ? 'has successfully completed the course'
              : 'a terminé avec succès le cours',
            0,
            250,
            {
              align: 'center',
            },
          );

        // Course title
        doc
          .fontSize(22)
          .font('Helvetica-Bold')
          .fillColor('#3498db')
          .text(course.title, 0, 290, {
            align: 'center',
          });

        // Completion date
        const completionDate = certificate.issuedAt.toLocaleDateString(
          isEnglish ? 'en-US' : 'fr-FR',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        );

        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#7f8c8d')
          .text(
            `${isEnglish ? 'Completion Date' : 'Date de réussite'}: ${completionDate}`,
            0,
            360,
            {
              align: 'center',
            },
          );

        // Certificate ID
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#95a5a6')
          .text(
            `${isEnglish ? 'Certificate ID' : 'ID du certificat'}: ${certificate.certificateId}`,
            0,
            doc.page.height - 100,
            {
              align: 'center',
            },
          );

        // Verification text
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#bdc3c7')
          .text(
            isEnglish
              ? 'Verify this certificate at: /api/certificates/verify/' +
                  certificate.certificateId
              : 'Vérifiez ce certificat à: /api/certificates/verify/' +
                  certificate.certificateId,
            0,
            doc.page.height - 70,
            {
              align: 'center',
            },
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Map certificate to response DTO
   */
  private mapToCertificateResponse(
    certificate: any,
    user: any,
    course: any,
  ): CertificateResponseDto {
    return {
      id: certificate.id,
      certificateId: certificate.certificateId,
      userId: certificate.userId,
      courseId: certificate.courseId,
      learnerName: this.formatLearnerDisplayName(user),
      courseTitle: course.title,
      issuedAt: certificate.issuedAt,
      pdfUrl: certificate.pdfUrl,
    };
  }
}
