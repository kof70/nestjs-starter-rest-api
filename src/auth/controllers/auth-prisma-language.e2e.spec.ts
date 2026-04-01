import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthPrismaModule } from '../auth-prisma.module';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Language } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../shared/configs/configuration';

describe('AuthPrismaController - Language Preference (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let userId: string;

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
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('PATCH /auth-prisma/me/language', () => {
    beforeEach(async () => {
      // Create test user and get auth token
      const registerResponse = await request(app.getHttpServer())
        .post('/auth-prisma/register')
        .send({
          email: `test-lang-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        });

      authToken = registerResponse.body.accessToken;
      userId = registerResponse.body.user.id;
    });

    afterEach(async () => {
      // Cleanup test user
      if (userId) {
        await prismaService.user.delete({ where: { id: userId } }).catch(() => {});
      }
    });

    it('should update language preference to FR', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .patch('/auth-prisma/me/language')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: Language.FR })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('language');
      expect(response.body.language).toBe(Language.FR);

      // Verify in database
      const updatedUser = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(updatedUser?.language).toBe(Language.FR);
    });

    it('should update language preference to EN', async () => {
      // First set to FR
      await request(app.getHttpServer())
        .patch('/auth-prisma/me/language')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: Language.FR });

      // Act - Change back to EN
      const response = await request(app.getHttpServer())
        .patch('/auth-prisma/me/language')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: Language.EN })
        .expect(200);

      // Assert
      expect(response.body.language).toBe(Language.EN);

      // Verify in database
      const updatedUser = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(updatedUser?.language).toBe(Language.EN);
    });

    it('should return 401 without authentication token', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .patch('/auth-prisma/me/language')
        .send({ language: Language.FR })
        .expect(401);
    });

    it('should return 400 with invalid language value', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .patch('/auth-prisma/me/language')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'INVALID' })
        .expect(400);
    });

    it('should include language in user profile', async () => {
      // Update language to FR
      await request(app.getHttpServer())
        .patch('/auth-prisma/me/language')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: Language.FR });

      // Act - Get profile
      const response = await request(app.getHttpServer())
        .get('/auth-prisma/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('language');
      expect(response.body.language).toBe(Language.FR);
    });
  });
});
