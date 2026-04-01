import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, ContentType } from '@prisma/client';

describe('QuizService', () => {
  let service: QuizService;

  const mockPrismaService = {
    quiz: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    question: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    questionOption: {
      deleteMany: jest.fn(),
    },
    quizAttempt: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    contentItem: {
      findUnique: jest.fn(),
    },
    module: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createQuiz', () => {
    const userId = 'user-123';
    const contentItemId = 'content-123';
    const courseOwnerId = 'user-123';

    const createQuizDto = {
      contentItemId,
      passingScore: 70,
      maxAttempts: 3,
      questions: [
        {
          questionText: 'What is 2+2?',
          options: [
            { optionText: '3', isCorrect: false },
            { optionText: '4', isCorrect: true },
          ],
        },
      ],
    };

    const mockContentItem = {
      id: contentItemId,
      type: ContentType.QUIZ,
      module: {
        course: {
          ownerId: courseOwnerId,
        },
      },
    };

    it('should create a quiz successfully (Requirement 4.1, 4.2, 4.3)', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);
      mockPrismaService.quiz.create.mockResolvedValue({
        id: 'quiz-123',
        ...createQuizDto,
        questions: [
          {
            id: 'question-123',
            questionText: 'What is 2+2?',
            order: 0,
            options: [
              { id: 'opt-1', optionText: '3', isCorrect: false, order: 0 },
              { id: 'opt-2', optionText: '4', isCorrect: true, order: 1 },
            ],
          },
        ],
      });

      const result = await service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR);

      expect(result).toBeDefined();
      expect(result.id).toBe('quiz-123');
      expect(mockPrismaService.contentItem.findUnique).toHaveBeenCalledWith({
        where: { id: contentItemId },
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if content item does not exist', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if content item is not of type QUIZ', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue({
        ...mockContentItem,
        type: ContentType.TEXT,
      });

      await expect(
        service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not the course owner', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue({
        ...mockContentItem,
        module: {
          course: {
            ownerId: 'different-user',
          },
        },
      });

      await expect(
        service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to create quiz regardless of ownership', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue({
        ...mockContentItem,
        module: {
          course: {
            ownerId: 'different-user',
          },
        },
      });
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);
      mockPrismaService.quiz.create.mockResolvedValue({
        id: 'quiz-123',
        ...createQuizDto,
        questions: [],
      });

      const result = await service.createQuiz(createQuizDto, userId, UserRole.ADMIN);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if quiz already exists for content item', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue({ id: 'existing-quiz' });

      await expect(
        service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if question has less than 2 options (Requirement 4.1)', async () => {
      const invalidDto = {
        ...createQuizDto,
        questions: [
          {
            questionText: 'Invalid question',
            options: [{ optionText: 'Only one', isCorrect: true }],
          },
        ],
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuiz(invalidDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if question has more than 6 options (Requirement 4.1)', async () => {
      const invalidDto = {
        ...createQuizDto,
        questions: [
          {
            questionText: 'Too many options',
            options: [
              { optionText: 'Opt 1', isCorrect: false },
              { optionText: 'Opt 2', isCorrect: false },
              { optionText: 'Opt 3', isCorrect: false },
              { optionText: 'Opt 4', isCorrect: false },
              { optionText: 'Opt 5', isCorrect: false },
              { optionText: 'Opt 6', isCorrect: false },
              { optionText: 'Opt 7', isCorrect: true },
            ],
          },
        ],
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuiz(invalidDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if question has no correct answer (Requirement 4.2)', async () => {
      const invalidDto = {
        ...createQuizDto,
        questions: [
          {
            questionText: 'No correct answer',
            options: [
              { optionText: 'Wrong 1', isCorrect: false },
              { optionText: 'Wrong 2', isCorrect: false },
            ],
          },
        ],
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuiz(invalidDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if question has multiple correct answers (Requirement 4.2)', async () => {
      const invalidDto = {
        ...createQuizDto,
        questions: [
          {
            questionText: 'Multiple correct',
            options: [
              { optionText: 'Correct 1', isCorrect: true },
              { optionText: 'Correct 2', isCorrect: true },
            ],
          },
        ],
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuiz(invalidDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitQuiz', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    const mockQuiz = {
      id: quizId,
      passingScore: 70,
      maxAttempts: 3,
      questions: [
        {
          id: 'q1',
          options: [
            { id: 'opt1', isCorrect: false },
            { id: 'opt2', isCorrect: true },
          ],
        },
        {
          id: 'q2',
          options: [
            { id: 'opt3', isCorrect: true },
            { id: 'opt4', isCorrect: false },
          ],
        },
      ],
      attempts: [],
    };

    it('should submit quiz and calculate score correctly (Requirement 4.4)', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 100,
        attemptNumber: 1,
        answers: { q1: 'opt2', q2: 'opt3' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: {
          q1: 'opt2', // correct
          q2: 'opt3', // correct
        },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.attemptsRemaining).toBe(2);
    });

    it('should calculate partial score correctly (Requirement 4.4)', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 50,
        attemptNumber: 1,
        answers: { q1: 'opt2', q2: 'opt4' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: {
          q1: 'opt2', // correct
          q2: 'opt4', // incorrect
        },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.score).toBe(50);
      expect(result.passed).toBe(false);
    });

    it('should throw BadRequestException when max attempts reached (Requirement 4.5)', async () => {
      const quizWithMaxAttempts = {
        ...mockQuiz,
        attempts: [
          { attemptNumber: 1 },
          { attemptNumber: 2 },
          { attemptNumber: 3 },
        ],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(quizWithMaxAttempts);

      const submitDto = {
        answers: { q1: 'opt2', q2: 'opt3' },
      };

      await expect(service.submitQuiz(quizId, submitDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow retry when attempts are available (Requirement 4.5)', async () => {
      const quizWithOneAttempt = {
        ...mockQuiz,
        attempts: [{ attemptNumber: 1 }],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(quizWithOneAttempt);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 100,
        attemptNumber: 2,
        answers: { q1: 'opt2', q2: 'opt3' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: { q1: 'opt2', q2: 'opt3' },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.attemptNumber).toBe(2);
      expect(result.attemptsRemaining).toBe(1);
    });

    it('should record attempt with timestamp (Requirement 4.7)', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      
      const mockAttempt = {
        id: 'attempt-123',
        userId,
        quizId,
        score: 100,
        attemptNumber: 1,
        answers: { q1: 'opt2', q2: 'opt3' },
        completedAt: new Date(),
      };
      
      mockPrismaService.quizAttempt.create.mockResolvedValue(mockAttempt);

      const submitDto = {
        answers: { q1: 'opt2', q2: 'opt3' },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.completedAt).toBeDefined();
      expect(mockPrismaService.quizAttempt.create).toHaveBeenCalledWith({
        data: {
          userId,
          quizId,
          score: 100,
          answers: submitDto.answers,
          attemptNumber: 1,
        },
      });
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      const submitDto = {
        answers: { q1: 'opt2' },
      };

      await expect(service.submitQuiz(quizId, submitDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCorrectAnswers', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    const mockQuizWithAttempts = {
      id: quizId,
      questions: [
        {
          id: 'q1',
          questionText: 'Question 1',
          options: [
            { id: 'opt1', optionText: 'Wrong', isCorrect: false },
            { id: 'opt2', optionText: 'Correct', isCorrect: true },
          ],
        },
      ],
      attempts: [{ id: 'attempt-1', userId }],
    };

    it('should return correct answers after quiz completion (Requirement 4.6)', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuizWithAttempts);

      const result = await service.getCorrectAnswers(quizId, userId);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].options.some((opt: any) => opt.isCorrect)).toBe(true);
    });

    it('should throw ForbiddenException if user has not completed quiz (Requirement 4.6)', async () => {
      const quizWithoutAttempts = {
        ...mockQuizWithAttempts,
        attempts: [],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(quizWithoutAttempts);

      await expect(service.getCorrectAnswers(quizId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.getCorrectAnswers(quizId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAttempts', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    it('should return all attempts for a user (Requirement 4.7)', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          userId,
          quizId,
          score: 50,
          attemptNumber: 1,
          completedAt: new Date('2024-01-01'),
        },
        {
          id: 'attempt-2',
          userId,
          quizId,
          score: 75,
          attemptNumber: 2,
          completedAt: new Date('2024-01-02'),
        },
      ];

      mockPrismaService.quiz.findUnique.mockResolvedValue({ id: quizId });
      mockPrismaService.quizAttempt.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getAttempts(quizId, userId);

      expect(result).toHaveLength(2);
      expect(result[0].attemptNumber).toBe(1);
      expect(result[1].attemptNumber).toBe(2);
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.getAttempts(quizId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('canRetry', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    it('should return true when attempts are available (Requirement 4.5)', async () => {
      const mockQuiz = {
        id: quizId,
        maxAttempts: 3,
        attempts: [{ attemptNumber: 1 }],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      const result = await service.canRetry(quizId, userId);

      expect(result).toBe(true);
    });

    it('should return false when max attempts reached (Requirement 4.5)', async () => {
      const mockQuiz = {
        id: quizId,
        maxAttempts: 3,
        attempts: [
          { attemptNumber: 1 },
          { attemptNumber: 2 },
          { attemptNumber: 3 },
        ],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      const result = await service.canRetry(quizId, userId);

      expect(result).toBe(false);
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.canRetry(quizId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addQuestion', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    const addQuestionDto = {
      questionText: 'New question?',
      options: [
        { optionText: 'Option 1', isCorrect: false },
        { optionText: 'Option 2', isCorrect: true },
      ],
    };

    const mockQuiz = {
      id: quizId,
      contentItem: {
        module: {
          course: {
            ownerId: userId,
          },
        },
      },
    };

    it('should add question to quiz (Requirement 4.1, 4.2)', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.question.findFirst.mockResolvedValue({ order: 2 });
      mockPrismaService.question.create.mockResolvedValue({
        id: 'question-123',
        quizId,
        questionText: addQuestionDto.questionText,
        order: 3,
        options: addQuestionDto.options.map((opt, idx) => ({
          id: `opt-${idx}`,
          ...opt,
          order: idx,
        })),
      });

      const result = await service.addQuestion(
        quizId,
        addQuestionDto,
        userId,
        UserRole.INSTRUCTOR,
      );

      expect(result).toBeDefined();
      expect(result.questionText).toBe(addQuestionDto.questionText);
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      const quizWithDifferentOwner = {
        ...mockQuiz,
        contentItem: {
          module: {
            course: {
              ownerId: 'different-user',
            },
          },
        },
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(quizWithDifferentOwner);

      await expect(
        service.addQuestion(quizId, addQuestionDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateQuestion', () => {
    const userId = 'user-123';
    const questionId = 'question-123';

    const updateQuestionDto = {
      questionText: 'Updated question?',
      options: [
        { optionText: 'New Option 1', isCorrect: false },
        { optionText: 'New Option 2', isCorrect: true },
      ],
    };

    const mockQuestion = {
      id: questionId,
      quiz: {
        contentItem: {
          module: {
            course: {
              ownerId: userId,
            },
          },
        },
      },
    };

    it('should update question successfully', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.questionOption.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.question.update.mockResolvedValue({
        id: questionId,
        questionText: updateQuestionDto.questionText,
        options: updateQuestionDto.options,
      });

      const result = await service.updateQuestion(
        questionId,
        updateQuestionDto,
        userId,
        UserRole.INSTRUCTOR,
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.questionOption.deleteMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if question does not exist', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue(null);

      await expect(
        service.updateQuestion(questionId, updateQuestionDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate options when updating (Requirement 4.1, 4.2)', async () => {
      const invalidDto = {
        questionText: 'Updated',
        options: [
          { optionText: 'Option 1', isCorrect: true },
          { optionText: 'Option 2', isCorrect: true },
        ],
      };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);

      await expect(
        service.updateQuestion(questionId, invalidDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update only question text when options not provided', async () => {
      const textOnlyDto = {
        questionText: 'Updated text only',
      };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.question.update.mockResolvedValue({
        id: questionId,
        questionText: textOnlyDto.questionText,
        options: [],
      });

      const result = await service.updateQuestion(
        questionId,
        textOnlyDto,
        userId,
        UserRole.INSTRUCTOR,
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.questionOption.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteQuestion', () => {
    const userId = 'user-123';
    const questionId = 'question-123';

    const mockQuestion = {
      id: questionId,
      quiz: {
        contentItem: {
          module: {
            course: {
              ownerId: userId,
            },
          },
        },
      },
    };

    it('should delete question successfully', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.question.delete.mockResolvedValue(mockQuestion);

      await service.deleteQuestion(questionId, userId, UserRole.INSTRUCTOR);

      expect(mockPrismaService.question.delete).toHaveBeenCalledWith({
        where: { id: questionId },
      });
    });

    it('should throw NotFoundException if question does not exist', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteQuestion(questionId, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      const questionWithDifferentOwner = {
        ...mockQuestion,
        quiz: {
          contentItem: {
            module: {
              course: {
                ownerId: 'different-user',
              },
            },
          },
        },
      };

      mockPrismaService.question.findUnique.mockResolvedValue(questionWithDifferentOwner);

      await expect(
        service.deleteQuestion(questionId, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to delete question regardless of ownership', async () => {
      const questionWithDifferentOwner = {
        ...mockQuestion,
        quiz: {
          contentItem: {
            module: {
              course: {
                ownerId: 'different-user',
              },
            },
          },
        },
      };

      mockPrismaService.question.findUnique.mockResolvedValue(questionWithDifferentOwner);
      mockPrismaService.question.delete.mockResolvedValue(questionWithDifferentOwner);

      await service.deleteQuestion(questionId, userId, UserRole.ADMIN);

      expect(mockPrismaService.question.delete).toHaveBeenCalled();
    });
  });

  describe('updateQuiz', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    const mockQuiz = {
      id: quizId,
      contentItem: {
        module: {
          course: {
            ownerId: userId,
          },
        },
      },
    };

    it('should update quiz settings successfully (Requirement 4.3)', async () => {
      const updateDto = {
        passingScore: 80,
        maxAttempts: 5,
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quiz.update.mockResolvedValue({
        ...mockQuiz,
        ...updateDto,
        questions: [],
      });

      const result = await service.updateQuiz(quizId, updateDto, userId, UserRole.INSTRUCTOR);

      expect(result).toBeDefined();
      expect(mockPrismaService.quiz.update).toHaveBeenCalledWith({
        where: { id: quizId },
        data: updateDto,
        include: {
          questions: {
            include: {
              options: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      const quizWithDifferentOwner = {
        ...mockQuiz,
        contentItem: {
          module: {
            course: {
              ownerId: 'different-user',
            },
          },
        },
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(quizWithDifferentOwner);

      await expect(
        service.updateQuiz(quizId, { passingScore: 80 }, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update quiz regardless of ownership', async () => {
      const quizWithDifferentOwner = {
        ...mockQuiz,
        contentItem: {
          module: {
            course: {
              ownerId: 'different-user',
            },
          },
        },
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(quizWithDifferentOwner);
      mockPrismaService.quiz.update.mockResolvedValue({
        ...quizWithDifferentOwner,
        passingScore: 90,
        questions: [],
      });

      const result = await service.updateQuiz(
        quizId,
        { passingScore: 90 },
        userId,
        UserRole.ADMIN,
      );

      expect(result).toBeDefined();
    });
  });

  describe('deleteQuiz', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    const mockQuiz = {
      id: quizId,
      contentItem: {
        module: {
          course: {
            ownerId: userId,
          },
        },
      },
    };

    it('should delete quiz successfully', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quiz.delete.mockResolvedValue(mockQuiz);

      await service.deleteQuiz(quizId, userId, UserRole.INSTRUCTOR);

      expect(mockPrismaService.quiz.delete).toHaveBeenCalledWith({
        where: { id: quizId },
      });
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      const quizWithDifferentOwner = {
        ...mockQuiz,
        contentItem: {
          module: {
            course: {
              ownerId: 'different-user',
            },
          },
        },
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(quizWithDifferentOwner);

      await expect(
        service.deleteQuiz(quizId, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    const quizId = 'quiz-123';

    it('should return quiz with questions and options', async () => {
      const mockQuiz = {
        id: quizId,
        questions: [
          {
            id: 'q1',
            questionText: 'Question 1',
            options: [
              { id: 'opt1', optionText: 'Option 1', isCorrect: false },
              { id: 'opt2', optionText: 'Option 2', isCorrect: true },
            ],
          },
        ],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      const result = await service.findById(quizId);

      expect(result).toBeDefined();
      expect(result.questions).toHaveLength(1);
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.findById(quizId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('grading logic edge cases', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    it('should handle zero score when all answers are wrong (Requirement 4.4)', async () => {
      const mockQuiz = {
        id: quizId,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            id: 'q1',
            options: [
              { id: 'opt1', isCorrect: false },
              { id: 'opt2', isCorrect: true },
            ],
          },
          {
            id: 'q2',
            options: [
              { id: 'opt3', isCorrect: true },
              { id: 'opt4', isCorrect: false },
            ],
          },
        ],
        attempts: [],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 0,
        attemptNumber: 1,
        answers: { q1: 'opt1', q2: 'opt4' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: {
          q1: 'opt1', // wrong
          q2: 'opt4', // wrong
        },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('should handle missing answers as incorrect (Requirement 4.4)', async () => {
      const mockQuiz = {
        id: quizId,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            id: 'q1',
            options: [
              { id: 'opt1', isCorrect: false },
              { id: 'opt2', isCorrect: true },
            ],
          },
          {
            id: 'q2',
            options: [
              { id: 'opt3', isCorrect: true },
              { id: 'opt4', isCorrect: false },
            ],
          },
        ],
        attempts: [],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 50,
        attemptNumber: 1,
        answers: { q1: 'opt2' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: {
          q1: 'opt2', // correct
          // q2 missing
        },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.score).toBe(50);
    });

    it('should handle exact passing score as pass (Requirement 4.4)', async () => {
      const mockQuiz = {
        id: quizId,
        passingScore: 50,
        maxAttempts: 3,
        questions: [
          {
            id: 'q1',
            options: [
              { id: 'opt1', isCorrect: false },
              { id: 'opt2', isCorrect: true },
            ],
          },
          {
            id: 'q2',
            options: [
              { id: 'opt3', isCorrect: true },
              { id: 'opt4', isCorrect: false },
            ],
          },
        ],
        attempts: [],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 50,
        attemptNumber: 1,
        answers: { q1: 'opt2', q2: 'opt4' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: {
          q1: 'opt2', // correct
          q2: 'opt4', // incorrect
        },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.score).toBe(50);
      expect(result.passed).toBe(true);
    });

    it('should calculate score with multiple questions correctly (Requirement 4.4)', async () => {
      const mockQuiz = {
        id: quizId,
        passingScore: 60,
        maxAttempts: 3,
        questions: [
          { id: 'q1', options: [{ id: 'opt1', isCorrect: true }] },
          { id: 'q2', options: [{ id: 'opt2', isCorrect: true }] },
          { id: 'q3', options: [{ id: 'opt3', isCorrect: true }] },
          { id: 'q4', options: [{ id: 'opt4', isCorrect: true }] },
          { id: 'q5', options: [{ id: 'opt5', isCorrect: true }] },
        ],
        attempts: [],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 60,
        attemptNumber: 1,
        answers: { q1: 'opt1', q2: 'opt2', q3: 'opt3', q4: 'wrong', q5: 'wrong' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: {
          q1: 'opt1', // correct
          q2: 'opt2', // correct
          q3: 'opt3', // correct
          q4: 'wrong', // incorrect
          q5: 'wrong', // incorrect
        },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.score).toBe(60);
      expect(result.passed).toBe(true);
    });
  });

  describe('retry limits edge cases', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    it('should correctly track attempt numbers (Requirement 4.5, 4.7)', async () => {
      const mockQuiz = {
        id: quizId,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            id: 'q1',
            options: [{ id: 'opt1', isCorrect: true }],
          },
        ],
        attempts: [{ attemptNumber: 1 }, { attemptNumber: 2 }],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 100,
        attemptNumber: 3,
        answers: { q1: 'opt1' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: { q1: 'opt1' },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.attemptNumber).toBe(3);
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should prevent submission on exactly max attempts (Requirement 4.5)', async () => {
      const mockQuiz = {
        id: quizId,
        passingScore: 70,
        maxAttempts: 2,
        questions: [
          {
            id: 'q1',
            options: [{ id: 'opt1', isCorrect: true }],
          },
        ],
        attempts: [{ attemptNumber: 1 }, { attemptNumber: 2 }],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      const submitDto = {
        answers: { q1: 'opt1' },
      };

      await expect(service.submitQuiz(quizId, submitDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitQuiz(quizId, submitDto, userId)).rejects.toThrow(
        /Maximum number of attempts/,
      );
    });

    it('should allow first attempt when no attempts exist (Requirement 4.5)', async () => {
      const mockQuiz = {
        id: quizId,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            id: 'q1',
            options: [{ id: 'opt1', isCorrect: true }],
          },
        ],
        attempts: [],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAttempt.create.mockResolvedValue({
        id: 'attempt-123',
        userId,
        quizId,
        score: 100,
        attemptNumber: 1,
        answers: { q1: 'opt1' },
        completedAt: new Date(),
      });

      const submitDto = {
        answers: { q1: 'opt1' },
      };

      const result = await service.submitQuiz(quizId, submitDto, userId);

      expect(result.attempt.attemptNumber).toBe(1);
      expect(result.attemptsRemaining).toBe(2);
    });
  });

  describe('correct answer display logic', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    it('should show correct answers after first attempt (Requirement 4.6)', async () => {
      const mockQuiz = {
        id: quizId,
        questions: [
          {
            id: 'q1',
            questionText: 'Question 1',
            options: [
              { id: 'opt1', optionText: 'Wrong', isCorrect: false },
              { id: 'opt2', optionText: 'Correct', isCorrect: true },
            ],
          },
        ],
        attempts: [{ id: 'attempt-1', userId, attemptNumber: 1 }],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      const result = await service.getCorrectAnswers(quizId, userId);

      expect(result).toBeDefined();
      expect(result[0].options.find((opt: any) => opt.isCorrect)).toBeDefined();
    });

    it('should show correct answers after multiple attempts (Requirement 4.6)', async () => {
      const mockQuiz = {
        id: quizId,
        questions: [
          {
            id: 'q1',
            questionText: 'Question 1',
            options: [
              { id: 'opt1', optionText: 'Wrong', isCorrect: false },
              { id: 'opt2', optionText: 'Correct', isCorrect: true },
            ],
          },
        ],
        attempts: [
          { id: 'attempt-1', userId, attemptNumber: 1 },
          { id: 'attempt-2', userId, attemptNumber: 2 },
        ],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      const result = await service.getCorrectAnswers(quizId, userId);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });

    it('should not show correct answers to users who have not attempted (Requirement 4.6)', async () => {
      const mockQuiz = {
        id: quizId,
        questions: [
          {
            id: 'q1',
            questionText: 'Question 1',
            options: [
              { id: 'opt1', optionText: 'Wrong', isCorrect: false },
              { id: 'opt2', optionText: 'Correct', isCorrect: true },
            ],
          },
        ],
        attempts: [],
      };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      await expect(service.getCorrectAnswers(quizId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getCorrectAnswers(quizId, userId)).rejects.toThrow(
        /must complete the quiz/,
      );
    });
  });

  describe('validation edge cases', () => {
    const userId = 'user-123';
    const contentItemId = 'content-123';

    it('should validate exactly 2 options as valid (Requirement 4.1)', async () => {
      const createQuizDto = {
        contentItemId,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            questionText: 'True or False?',
            options: [
              { optionText: 'True', isCorrect: true },
              { optionText: 'False', isCorrect: false },
            ],
          },
        ],
      };

      const mockContentItem = {
        id: contentItemId,
        type: ContentType.QUIZ,
        module: {
          course: {
            ownerId: userId,
          },
        },
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);
      mockPrismaService.quiz.create.mockResolvedValue({
        id: 'quiz-123',
        ...createQuizDto,
        questions: [],
      });

      const result = await service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR);

      expect(result).toBeDefined();
    });

    it('should validate exactly 6 options as valid (Requirement 4.1)', async () => {
      const createQuizDto = {
        contentItemId,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            questionText: 'Pick one',
            options: [
              { optionText: 'Opt 1', isCorrect: false },
              { optionText: 'Opt 2', isCorrect: false },
              { optionText: 'Opt 3', isCorrect: false },
              { optionText: 'Opt 4', isCorrect: false },
              { optionText: 'Opt 5', isCorrect: false },
              { optionText: 'Opt 6', isCorrect: true },
            ],
          },
        ],
      };

      const mockContentItem = {
        id: contentItemId,
        type: ContentType.QUIZ,
        module: {
          course: {
            ownerId: userId,
          },
        },
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);
      mockPrismaService.quiz.create.mockResolvedValue({
        id: 'quiz-123',
        ...createQuizDto,
        questions: [],
      });

      const result = await service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR);

      expect(result).toBeDefined();
    });

    it('should reject question with all incorrect answers (Requirement 4.2)', async () => {
      const createQuizDto = {
        contentItemId,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            questionText: 'No correct answer',
            options: [
              { optionText: 'Wrong 1', isCorrect: false },
              { optionText: 'Wrong 2', isCorrect: false },
              { optionText: 'Wrong 3', isCorrect: false },
            ],
          },
        ],
      };

      const mockContentItem = {
        id: contentItemId,
        type: ContentType.QUIZ,
        module: {
          course: {
            ownerId: userId,
          },
        },
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(mockContentItem);
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createQuiz(createQuizDto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(/exactly one correct answer/);
    });
  });
});
