import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { VALIDATION_PIPE_OPTIONS } from './shared/constants';
import { RequestIdMiddleware } from './shared/middlewares/request-id/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  app.use(RequestIdMiddleware);
  app.enableCors();

  /** Swagger configuration*/
  const options = new DocumentBuilder()
    .setTitle('E-Learning Platform API')
    .setDescription('MVP E-Learning Platform - LMS/CMS REST API with JWT authentication')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication and user management')
    .addTag('cms', 'Content Management System - Course creation and management')
    .addTag('lms', 'Learning Management System - Course enrollment and learning')
    .addTag('quiz', 'Quiz management and submissions')
    .addTag('progress', 'Progress tracking and analytics')
    .addTag('certificates', 'Certificate generation and verification')
    .addTag('assets', 'Asset and media management')
    .addTag('videos', 'Video management')
    .addTag('announcements', 'Course announcements')
    .addTag('teams', 'Course team collaboration')
    .addTag('notifications', 'Notification management')
    .addTag('grading', 'Grading system')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('swagger', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  await app.listen(port || 3000);
}
bootstrap();
