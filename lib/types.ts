// ─── Game State ────────────────────────────────────────────────────────────────

export type GameStatus =
  | 'idle'
  | 'lobby'
  | 'question'
  | 'revealing'
  | 'leaderboard'
  | 'winner-reveal'
  | 'finished';

export type WinnerRevealPhase =
  | 'idle'
  | 'start'
  | 'rank4'
  | 'rank3'
  | 'rank2'
  | 'rank1';

export interface GameState {
  status: GameStatus;
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  winnerRevealPhase: WinnerRevealPhase;
}

// ─── Players ───────────────────────────────────────────────────────────────────

export interface PlayerAnswer {
  answer: string;
  answeredAt: number;
  score: number;
  correct: boolean;
}

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
  totalScore: number;
  answers: Record<number, PlayerAnswer>;
}

export interface ScoreEntry {
  playerId: string;
  name: string;
  totalScore: number;
  rank: number;
}

// ─── Questions ─────────────────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'truefalse';

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  funFact?: string; // Shown after reveal
}

// Public version — no correctAnswer
export interface PublicQuestion {
  id: number;
  type: QuestionType;
  text: string;
  options: string[];
  funFact?: string;
}

// ─── API Payloads ──────────────────────────────────────────────────────────────

export type AdminCommand =
  | { type: 'open-game' }
  | { type: 'start-quiz' }
  | { type: 'reveal-answers' }
  | { type: 'next-question' }
  | { type: 'show-leaderboard' }
  | { type: 'advance-leaderboard' }
  | { type: 'start-winner-reveal' }
  | { type: 'advance-winner' }
  | { type: 'reset-game' };

export interface GameStateResponse {
  status: GameStatus;
  currentQuestionIndex: number;
  question: PublicQuestion | null;
  players: { id: string; name: string }[];
  questionEndsAt: number | null;
  playerCount: number;
  winnerRevealPhase: WinnerRevealPhase;
}

// ─── Pusher Events ─────────────────────────────────────────────────────────────

export interface PusherPlayerJoined {
  players: { id: string; name: string }[];
}

export interface PusherQuestion {
  index: number;
  question: PublicQuestion;
  endsAt: number;
}

export interface PusherAnswerRevealed {
  index: number;
  correctAnswer: string;
  funFact?: string;
  scores: ScoreEntry[];
}

export interface PusherLeaderboard {
  scores: ScoreEntry[];
  trigger: 'mid' | 'final';
}

export interface PusherWinnerReveal {
  phase: WinnerRevealPhase;
  entry?: ScoreEntry;
  allScores?: ScoreEntry[];
}

export interface PusherAnswerUpdate {
  questionIndex: number;
  answered: number;
  total: number;
  allAnswered: boolean;
}
