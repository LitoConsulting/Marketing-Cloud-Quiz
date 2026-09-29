// Pure game-flow helpers shared by the server (what happens next) and the admin UI (button label).
import { GameStatus, QuizInfo, WinnerRevealPhase } from './types';

interface FlowState {
  status: GameStatus;
  currentQuestionIndex: number;
  winnerRevealPhase: WinnerRevealPhase;
}

/** Podium steps after the honorable mentions, skipping places nobody holds (e.g. only 2 players). */
export function podiumPhases(playerCount: number): WinnerRevealPhase[] {
  const phases: WinnerRevealPhase[] = [];
  if (playerCount >= 3) phases.push('rank3');
  if (playerCount >= 2) phases.push('rank2');
  if (playerCount >= 1) phases.push('rank1');
  return phases;
}

export function isLastQuestion(index: number, quiz: QuizInfo): boolean {
  return index >= quiz.totalQuestions - 1;
}

export function showsMidLeaderboardAfter(index: number, quiz: QuizInfo): boolean {
  return quiz.leaderboardAfterQuestion === index && !isLastQuestion(index, quiz);
}

export type NextAction =
  | { kind: 'start-question'; index: number }
  | { kind: 'reveal' }
  | { kind: 'leaderboard'; final: boolean }
  | { kind: 'winner-phase'; phase: WinnerRevealPhase }
  | { kind: 'finish' }
  | { kind: 'none' };

export function nextAction(state: FlowState, quiz: QuizInfo, playerCount: number): NextAction {
  const idx = state.currentQuestionIndex;
  switch (state.status) {
    case 'lobby':
      return quiz.totalQuestions > 0 ? { kind: 'start-question', index: 0 } : { kind: 'none' };
    case 'question':
      return { kind: 'reveal' };
    case 'revealing':
      if (showsMidLeaderboardAfter(idx, quiz)) return { kind: 'leaderboard', final: false };
      if (isLastQuestion(idx, quiz)) return { kind: 'leaderboard', final: true };
      return { kind: 'start-question', index: idx + 1 };
    case 'leaderboard':
      if (isLastQuestion(idx, quiz)) return { kind: 'winner-phase', phase: 'start' };
      return { kind: 'start-question', index: idx + 1 };
    case 'winner-reveal': {
      const phases: WinnerRevealPhase[] = ['start', ...podiumPhases(playerCount)];
      const next = phases[phases.indexOf(state.winnerRevealPhase) + 1];
      return next ? { kind: 'winner-phase', phase: next } : { kind: 'finish' };
    }
    default:
      return { kind: 'none' };
  }
}

export function nextActionLabel(action: NextAction): string {
  switch (action.kind) {
    case 'start-question':
      return action.index === 0 ? 'Start Quiz' : `Next: Question ${action.index + 1}`;
    case 'reveal':
      return 'Reveal Answer';
    case 'leaderboard':
      return action.final ? 'Show Final Screen' : 'Show Leaderboard';
    case 'winner-phase':
      if (action.phase === 'start') return 'Start Winner Reveal';
      return `Reveal ${action.phase === 'rank3' ? '3rd' : action.phase === 'rank2' ? '2nd' : '1st'} Place`;
    case 'finish':
      return 'Show Final Podium';
    default:
      return '';
  }
}
