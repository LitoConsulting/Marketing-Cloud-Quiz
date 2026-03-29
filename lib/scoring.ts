import { QUESTION_DURATION_MS } from './questions';

export function calculateScore(
  answeredAt: number,
  questionStartedAt: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;
  const elapsed = answeredAt - questionStartedAt;
  const ratio = Math.max(0, 1 - elapsed / QUESTION_DURATION_MS);
  return Math.round(1000 * ratio);
}
