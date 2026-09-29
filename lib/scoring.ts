// Kahoot-style: a correct answer is always worth at least 500, plus up to 500 for speed.
// Slow readers still get rewarded for knowing the answer.
export const BASE_POINTS = 500;
export const SPEED_POINTS = 500;

export function calculateScore(elapsedMs: number, durationMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  const ratio = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return Math.round(BASE_POINTS + SPEED_POINTS * (1 - ratio));
}
