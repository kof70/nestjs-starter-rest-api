import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { CertificateService } from '../services/certificate.service';
import {
  CertificateResponseDto,
  CertificateVerificationDto,
} from '../dtos/certificate-response.dto';

export type CertificateRequestUser = { id: string; role: UserRole };
export type CertificateAuthedRequest = Request & { user: CertificateRequestUser };

/**
 * Certificate controller
 * Requirements: 7.4, 7.5
 */
@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  /**
   * Get all certificates for current user
   * Requirements: 7.4
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getUserCertificates(
    @Req() req: CertificateAuthedRequest,
  ): Promise<CertificateResponseDto[]> {
    return this.certificateService.getUserCertificates(req.user.id);
  }

  /**
   * Generate certificate for a course
   * Requirements: 7.1, 7.6
   */
  @Post('courses/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEARNER)
  @HttpCode(HttpStatus.CREATED)
  async generateCertificate(
    @Param('courseId') courseId: string,
    @Req() req: CertificateAuthedRequest,
  ): Promise<CertificateResponseDto> {
    return this.certificateService.generateCertificate(req.user.id, courseId);
  }

  /**
   * Download certificate PDF
   * Requirements: 7.3, 7.4
   */
  @Get(':id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  async downloadCertificate(
    @Param('id') certificateId: string,
    @Req() req: CertificateAuthedRequest,
    @Res() res: Response,
  ): Promise<void> {
    // Get certificate to verify ownership
    const certificate = await this.certificateService.getCertificateById(
      certificateId,
    );

    // Verify user owns the certificate or is admin/instructor
    if (
      certificate.userId !== req.user.id &&
      req.user.role !== UserRole.ADMIN &&
      req.user.role !== UserRole.INSTRUCTOR
    ) {
      throw new NotFoundException('Certificate not found');
    }

    // Generate PDF
    const pdfBuffer = await this.certificateService.generateCertificatePDF(
      certificateId,
    );

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${certificate.certificateId}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  }

  /**
   * Public endpoint to verify certificate authenticity
   * Requirements: 7.5
   */
  @Get('verify/:certificateId')
  @HttpCode(HttpStatus.OK)
  async verifyCertificate(
    @Param('certificateId') certificateId: string,
  ): Promise<CertificateVerificationDto> {
    return this.certificateService.verifyCertificate(certificateId);
  }

  /**
   * Get certificates for a specific course (Instructor/Admin only)
   * Requirements: 7.4
   */
  @Get('courses/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getCourseCertificates(
    @Param('courseId') courseId: string,
  ): Promise<CertificateResponseDto[]> {
    return this.certificateService.getCourseCertificates(courseId);
  }
}
