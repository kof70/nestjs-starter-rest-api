jest.mock('../shared/prisma/prisma.service', () => {
  const { Injectable } = require('@nestjs/common');
  @Injectable()
  class PrismaServiceMock {}
  return { PrismaService: PrismaServiceMock };
});

jest.mock('../shared/shared.module', () => {
  const { Module } = require('@nestjs/common');
  const { PrismaModule } = require('../shared/prisma/prisma.module');
  @Module({
    imports: [PrismaModule],
    exports: [PrismaModule],
  })
  class SharedModuleStub {}
  return { SharedModule: SharedModuleStub };
});

jest.mock('../team/team.module', () => ({
  __esModule: true,
  TeamModule: class TeamModuleStub {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { QuizModule } from './quiz.module';
import { QuizService } from './services/quiz.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('QuizModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [QuizModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide QuizService', () => {
    const service = module.get<QuizService>(QuizService);
    expect(service).toBeDefined();
  });
});
