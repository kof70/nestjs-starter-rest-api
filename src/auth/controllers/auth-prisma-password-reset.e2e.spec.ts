import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthPrismaModule } from '../auth-prisma.module';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../shared/configs/configuration';

describe('AuthPrismaController - Password Reset & Email Verification (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        AuthPrismaModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /auth-prisma/password-reset/request', () => {
    it('should accept valid email and return success message', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth-prisma/password-reset/request')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset link');
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth-prisma/password-reset/request')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should reject missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth-prisma/password-reset/request')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth-prisma/password-reset/confirm', () => {
    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth-prisma/password-reset/confirm')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123',
        })
        .expect(400);
    });

    it('should reject missing fields', async () => {
      await request(app.getHttpServer())
        .post('/auth-prisma/password-reset/confirm')
        .send({ token: 'some-token' })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/auth-prisma/password-reset/confirm')
        .send({
          token: 'some-token',
          newPassword: '12345', // Less than 6 characters
        })
        .expect(400);
    });
  });

  describe('POST /auth-prisma/verify-email', () => {
    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth-prisma/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);
    });

    it('should reject missing token', async () => {
      await request(app.getHttpServer())
        .post('/auth-prisma/verify-email')
        .send({})
        .expect(400);
    });
  });
});
