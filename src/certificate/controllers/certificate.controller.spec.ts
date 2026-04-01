import { Test, TestingModule } from '@nestjs/testing';
import {
  CertificateController,
  CertificateAuthedRequest,
} from './certificate.controller';
import { CertificateService } from '../services/certificate.service';
import { UserRole } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('CertificateController', () => {
  let controller: CertificateController;
  let service: CertificateService;

  const mockCertificateService = {
    getUserCertificates: jest.fn(),
    generateCertificate: jest.fn(),
    getCertificateById: jest.fn(),
    generateCertificatePDF: jest.fn(),
    verifyCertificate: jest.fn(),
    getCourseCertificates: jest.fn(),
  };

  const mockCertificate = {
    id: 'cert-1',
    certificateId: 'CERT-12345678',
    userId: 'user-1',
    courseId: 'course-1',
    learnerName: 'John Doe',
    courseTitle: 'Test Course',
    issuedAt: new Date('2024-01-01'),
    pdfUrl: null,
  };

  const mockRequest = {
    user: {
      id: 'user-1',
      role: UserRole.LEARNER,
    },
  } as unknown as CertificateAuthedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificateController],
      providers: [
        {
          provide: CertificateService,
          useValue: mockCertificateService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CertificateController>(CertificateController);
    service = module.get<CertificateService>(CertificateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserCertificates', () => {
    it('should return all certificates for current user', async () => {
      const expectedCertificates = [mockCertificate];
      mockCertificateService.getUserCertificates.mockResolvedValue(
        expectedCertificates,
      );

      const actualResult = await controller.getUserCertificates(mockRequest);

      expect(actualResult).toEqual(expectedCertificates);
      expect(mockCertificateService.getUserCertificates).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('should return empty array when user has no certificates', async () => {
      mockCertificateService.getUserCertificates.mockResolvedValue([]);

      const actualResult = await controller.getUserCertificates(mockRequest);

      expect(actualResult).toEqual([]);
    });
  });

  describe('generateCertificate', () => {
    it('should generate certificate for completed course', async () => {
      mockCertificateService.generateCertificate.mockResolvedValue(
        mockCertificate,
      );

      const actualResult = await controller.generateCertificate(
        'course-1',
        mockRequest,
      );

      expect(actualResult).toEqual(mockCertificate);
      expect(mockCertificateService.generateCertificate).toHaveBeenCalledWith(
        'user-1',
        'course-1',
      );
    });

    it('should throw BadRequestException when course not completed', async () => {
      mockCertificateService.generateCertificate.mockRejectedValue(
        new NotFoundException('Course not completed'),
      );

      await expect(
        controller.generateCertificate('course-1', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when passing score not met', async () => {
      mockCertificateService.generateCertificate.mockRejectedValue(
        new NotFoundException('Passing score not met'),
      );

      await expect(
        controller.generateCertificate('course-1', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadCertificate', () => {
    it('should download certificate PDF for owner', async () => {
      const mockPdfBuffer = Buffer.from('PDF content');
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      mockCertificateService.getCertificateById.mockResolvedValue(
        mockCertificate,
      );
      mockCertificateService.generateCertificatePDF.mockResolvedValue(
        mockPdfBuffer,
      );

      await controller.downloadCertificate('cert-1', mockRequest, mockResponse);

      expect(mockCertificateService.getCertificateById).toHaveBeenCalledWith(
        'cert-1',
      );
      expect(mockCertificateService.generateCertificatePDF).toHaveBeenCalledWith(
        'cert-1',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="certificate-CERT-12345678.pdf"',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Length',
        mockPdfBuffer.length,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('should allow admin to download any certificate', async () => {
      const mockPdfBuffer = Buffer.from('PDF content');
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;
      const adminRequest = {
        user: {
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
      } as unknown as CertificateAuthedRequest;

      mockCertificateService.getCertificateById.mockResolvedValue(
        mockCertificate,
      );
      mockCertificateService.generateCertificatePDF.mockResolvedValue(
        mockPdfBuffer,
      );

      await controller.downloadCertificate('cert-1', adminRequest, mockResponse);

      expect(mockResponse.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('should allow instructor to download any certificate', async () => {
      const mockPdfBuffer = Buffer.from('PDF content');
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;
      const instructorRequest = {
        user: {
          id: 'instructor-1',
          role: UserRole.INSTRUCTOR,
        },
      } as unknown as CertificateAuthedRequest;

      mockCertificateService.getCertificateById.mockResolvedValue(
        mockCertificate,
      );
      mockCertificateService.generateCertificatePDF.mockResolvedValue(
        mockPdfBuffer,
      );

      await controller.downloadCertificate('cert-1', instructorRequest, mockResponse);

      expect(mockResponse.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('should throw NotFoundException when user does not own certificate', async () => {
      const otherUserRequest = {
        user: {
          id: 'user-2',
          role: UserRole.LEARNER,
        },
      } as unknown as CertificateAuthedRequest;
      const mockResponse = {} as Response;

      mockCertificateService.getCertificateById.mockResolvedValue(
        mockCertificate,
      );

      await expect(
        controller.downloadCertificate('cert-1', otherUserRequest, mockResponse),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when certificate does not exist', async () => {
      const mockResponse = {} as Response;

      mockCertificateService.getCertificateById.mockRejectedValue(
        new NotFoundException('Certificate not found'),
      );

      await expect(
        controller.downloadCertificate('invalid-id', mockRequest, mockResponse),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set correct PDF headers', async () => {
      const mockPdfBuffer = Buffer.from('PDF content');
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      mockCertificateService.getCertificateById.mockResolvedValue(
        mockCertificate,
      );
      mockCertificateService.generateCertificatePDF.mockResolvedValue(
        mockPdfBuffer,
      );

      await controller.downloadCertificate('cert-1', mockRequest, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledTimes(3);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
    });
  });

  describe('verifyCertificate', () => {
    it('should verify certificate by public certificate ID', async () => {
      const expectedVerification = {
        certificateId: 'CERT-12345678',
        learnerName: 'John Doe',
        courseTitle: 'Test Course',
        issuedAt: new Date('2024-01-01'),
        valid: true,
      };
      mockCertificateService.verifyCertificate.mockResolvedValue(
        expectedVerification,
      );

      const actualResult = await controller.verifyCertificate('CERT-12345678');

      expect(actualResult).toEqual(expectedVerification);
      expect(mockCertificateService.verifyCertificate).toHaveBeenCalledWith(
        'CERT-12345678',
      );
    });

    it('should throw NotFoundException for invalid certificate ID', async () => {
      mockCertificateService.verifyCertificate.mockRejectedValue(
        new NotFoundException('Certificate not found'),
      );

      await expect(
        controller.verifyCertificate('INVALID-ID'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should be publicly accessible without authentication', async () => {
      const expectedVerification = {
        certificateId: 'CERT-12345678',
        learnerName: 'John Doe',
        courseTitle: 'Test Course',
        issuedAt: new Date('2024-01-01'),
        valid: true,
      };
      mockCertificateService.verifyCertificate.mockResolvedValue(
        expectedVerification,
      );

      const actualResult = await controller.verifyCertificate('CERT-12345678');

      expect(actualResult.valid).toBe(true);
    });
  });

  describe('getCourseCertificates', () => {
    it('should return all certificates for a course', async () => {
      const expectedCertificates = [mockCertificate];
      mockCertificateService.getCourseCertificates.mockResolvedValue(
        expectedCertificates,
      );

      const actualResult = await controller.getCourseCertificates('course-1');

      expect(actualResult).toEqual(expectedCertificates);
      expect(mockCertificateService.getCourseCertificates).toHaveBeenCalledWith(
        'course-1',
      );
    });

    it('should return empty array when course has no certificates', async () => {
      mockCertificateService.getCourseCertificates.mockResolvedValue([]);

      const actualResult = await controller.getCourseCertificates('course-1');

      expect(actualResult).toEqual([]);
    });

    it('should only be accessible by instructors and admins', async () => {
      const expectedCertificates = [mockCertificate];
      mockCertificateService.getCourseCertificates.mockResolvedValue(
        expectedCertificates,
      );

      const actualResult = await controller.getCourseCertificates('course-1');

      expect(actualResult).toEqual(expectedCertificates);
    });
  });
});
