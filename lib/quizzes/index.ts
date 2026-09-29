import { PublicQuestion, Quiz, QuizInfo } from '../types';
import { dreamforce2026 } from './dreamforce-2026';
import { spring2026Meetup } from './spring-2026-meetup';

// To add a quiz: create a file in this folder and add it here.
// The host picks the active quiz in /admin before opening the lobby.
export const QUIZZES: Quiz[] = [dreamforce2026, spring2026Meetup];

export const DEFAULT_QUIZ_ID = dreamforce2026.id;

export function getQuiz(id: string | undefined | null): Quiz {
  return QUIZZES.find((q) => q.id === id) ?? QUIZZES.find((q) => q.id === DEFAULT_QUIZ_ID)!;
}

export function toQuizInfo(quiz: Quiz): QuizInfo {
  return {
    id: quiz.id,
    title: quiz.title,
    subtitle: quiz.subtitle,
    totalQuestions: quiz.questions.length,
    questionDurationMs: quiz.questionDurationMs,
    leaderboardAfterQuestion: quiz.leaderboardAfterQuestion,
  };
}

export function getPublicQuestion(quiz: Quiz, index: number): PublicQuestion | null {
  const q = quiz.questions[index];
  if (!q) return null;
  return { type: q.type, text: q.text, options: q.options };
}

// Fail fast in dev if a quiz is misconfigured (typo in correctAnswer, duplicate options...)
for (const quiz of QUIZZES) {
  quiz.questions.forEach((q, i) => {
    if (!q.options.includes(q.correctAnswer)) {
      throw new Error(`Quiz "${quiz.id}" question ${i + 1}: correctAnswer is not one of the options`);
    }
    if (new Set(q.options).size !== q.options.length) {
      throw new Error(`Quiz "${quiz.id}" question ${i + 1}: duplicate options`);
    }
  });
}
