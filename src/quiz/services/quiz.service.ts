import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateQuizDto } from '../dtos/create-quiz.dto';
import { UpdateQuizDto } from '../dtos/update-quiz.dto';
import { AddQuestionDto } from '../dtos/add-question.dto';
import { UpdateQuestionDto } from '../dtos/update-question.dto';
import { SubmitQuizDto } from '../dtos/submit-quiz.dto';
import { UserRole, ContentType } from '@prisma/client';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new quiz with questions
   * Requirements: 4.1, 4.2, 4.3
   */
  async createQuiz(dto: CreateQuizDto, userId: string, userRole: UserRole) {
    // Verify content item exists and is of type QUIZ
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: dto.contentItemId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!contentItem) {
      throw new NotFoundException('Content item not found');
    }

    if (contentItem.type !== ContentType.QUIZ) {
      throw new BadRequestException('Content item must be of type QUIZ');
    }

    // Check ownership
    if (
      userRole !== UserRole.ADMIN &&
      contentItem.module.course.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to create a quiz for this content item',
      );
    }

    // Check if quiz already exists for this content item
    const existingQuiz = await this.prisma.quiz.findUnique({
      where: { contentItemId: dto.contentItemId },
    });

    if (existingQuiz) {
      throw new BadRequestException(
        'A quiz already exists for this content item',
      );
    }

    // Validate questions
    for (const question of dto.questions) {
      this.validateQuestion(question.options);
    }

    // Create quiz with questions
    const quiz = await this.prisma.quiz.create({
      data: {
        contentItemId: dto.contentItemId,
        passingScore: dto.passingScore ?? 70.0,
        maxAttempts: dto.maxAttempts ?? 3,
        questions: {
          create: dto.questions.map((q, qIndex) => ({
            questionText: q.questionText,
            order: qIndex,
            options: {
              create: q.options.map((opt, optIndex) => ({
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
                order: optIndex,
              })),
            },
          })),
        },
      },
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

    return quiz;
  }

  /**
   * Update quiz settings
   * Requirements: 4.3
   */
  async updateQuiz(
    quizId: string,
    dto: UpdateQuizDto,
    userId: string,
    userRole: UserRole,
  ) {
    const quiz = await this.findQuizWithOwnership(quizId);

    // Check ownership
    if (
      userRole !== UserRole.ADMIN &&
      quiz.contentItem.module.course.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this quiz',
      );
    }

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        passingScore: dto.passingScore,
        maxAttempts: dto.maxAttempts,
      },
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
  }

  /**
   * Delete a quiz
   */
  async deleteQuiz(quizId: string, userId: string, userRole: UserRole) {
    const quiz = await this.findQuizWithOwnership(quizId);

    // Check ownership
    if (
      userRole !== UserRole.ADMIN &&
      quiz.contentItem.module.course.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this quiz',
      );
    }

    await this.prisma.quiz.delete({
      where: { id: quizId },
    });
  }

  /**
   * Add a question to a quiz
   * Requirements: 4.1, 4.2
   */
  async addQuestion(
    quizId: string,
    dto: AddQuestionDto,
    userId: string,
    userRole: UserRole,
  ) {
    const quiz = await this.findQuizWithOwnership(quizId);

    // Check ownership
    if (
      userRole !== UserRole.ADMIN &&
      quiz.contentItem.module.course.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to add questions to this quiz',
      );
    }

    // Validate question
    this.validateQuestion(dto.options);

    // Get the next order number
    const maxOrder = await this.prisma.question.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const nextOrder = maxOrder ? maxOrder.order + 1 : 0;

    return this.prisma.question.create({
      data: {
        quizId,
        questionText: dto.questionText,
        order: nextOrder,
        options: {
          create: dto.options.map((opt, index) => ({
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            order: index,
          })),
        },
      },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Update a question
   * Requirements: 4.1, 4.2
   */
  async updateQuestion(
    questionId: string,
    dto: UpdateQuestionDto,
    userId: string,
    userRole: UserRole,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            contentItem: {
              include: {
                module: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Check ownership
    if (
      userRole !== UserRole.ADMIN &&
      question.quiz.contentItem.module.course.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this question',
      );
    }

    // Validate options if provided
    if (dto.options) {
      this.validateQuestion(dto.options);
    }

    // Update question
    const updateData: any = {};
    if (dto.questionText !== undefined) {
      updateData.questionText = dto.questionText;
    }

    // If options are provided, delete old ones and create new ones
    if (dto.options) {
      await this.prisma.questionOption.deleteMany({
        where: { questionId },
      });

      updateData.options = {
        create: dto.options.map((opt, index) => ({
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
          order: index,
        })),
      };
    }

    return this.prisma.question.update({
      where: { id: questionId },
      data: updateData,
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Delete a question
   */
  async deleteQuestion(
    questionId: string,
    userId: string,
    userRole: UserRole,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            contentItem: {
              include: {
                module: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Check ownership
    if (
      userRole !== UserRole.ADMIN &&
      question.quiz.contentItem.module.course.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this question',
      );
    }

    await this.prisma.question.delete({
      where: { id: questionId },
    });
  }

  /**
   * Submit quiz answers and get immediate grading
   * Requirements: 4.4, 4.5, 4.6, 4.7
   */
  async submitQuiz(quizId: string, dto: SubmitQuizDto, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
        attempts: {
          where: { userId },
          orderBy: { attemptNumber: 'desc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Check if user can retry (Requirement 4.5)
    const attemptCount = quiz.attempts.length;
    if (attemptCount >= quiz.maxAttempts) {
      throw new BadRequestException(
        `Maximum number of attempts (${quiz.maxAttempts}) reached`,
      );
    }

    // Calculate score (Requirement 4.4)
    const score = this.calculateScore(quiz.questions, dto.answers);

    // Create quiz attempt (Requirement 4.7)
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        score,
        answers: dto.answers,
        attemptNumber: attemptCount + 1,
      },
    });

    return {
      attempt,
      passed: score >= quiz.passingScore,
      passingScore: quiz.passingScore,
      attemptsRemaining: quiz.maxAttempts - (attemptCount + 1),
    };
  }

  /**
   * Get quiz attempts for a user
   * Requirements: 4.7
   */
  async getAttempts(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId,
      },
      orderBy: { attemptNumber: 'asc' },
    });
  }

  /**
   * Check if user can retry the quiz
   * Requirements: 4.5
   */
  async canRetry(quizId: string, userId: string): Promise<boolean> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        attempts: {
          where: { userId },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz.attempts.length < quiz.maxAttempts;
  }

  /**
   * Get correct answers (only after completion)
   * Requirements: 4.6
   */
  async getCorrectAnswers(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        attempts: {
          where: { userId },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Check if user has completed at least one attempt (Requirement 4.6)
    if (quiz.attempts.length === 0) {
      throw new ForbiddenException(
        'You must complete the quiz before viewing correct answers',
      );
    }

    return quiz.questions;
  }

  /**
   * Get quiz by ID
   */
  async findById(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
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

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  /**
   * Validate question options
   * Requirements: 4.1, 4.2
   */
  private validateQuestion(options: Array<{ optionText: string; isCorrect: boolean }>) {
    // Requirement 4.1: 2-6 options (validated by DTO, but double-check)
    if (options.length < 2 || options.length > 6) {
      throw new BadRequestException('Questions must have between 2 and 6 options');
    }

    // Requirement 4.2: Exactly one correct answer
    const correctCount = options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException('Each question must have exactly one correct answer');
    }
  }

  /**
   * Calculate quiz score
   * Requirements: 4.4
   */
  private calculateScore(
    questions: Array<{
      id: string;
      options: Array<{ id: string; isCorrect: boolean }>;
    }>,
    answers: Record<string, string>,
  ): number {
    let correctAnswers = 0;

    for (const question of questions) {
      const userAnswer = answers[question.id];
      if (!userAnswer) {
        continue;
      }

      const selectedOption = question.options.find((opt) => opt.id === userAnswer);
      if (selectedOption && selectedOption.isCorrect) {
        correctAnswers++;
      }
    }

    return (correctAnswers / questions.length) * 100;
  }

  /**
   * Find quiz with ownership information
   */
  private async findQuizWithOwnership(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        contentItem: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }
}
