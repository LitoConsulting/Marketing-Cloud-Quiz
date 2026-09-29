// ─── Game State ────────────────────────────────────────────────────────────────

export type GameStatus =
  | 'idle'
  | 'lobby'
  | 'question'
  | 'revealing'
  | 'leaderboard'
  | 'winner-reveal'
  | 'finished';

export type WinnerRevealPhase = 'idle' | 'start' | 'rank3' | 'rank2' | 'rank1';

export interface RevealSummary {
  questionIndex: number;
  correctAnswer: string;
  funFact?: string;
  distribution: number[]; // answer count per option, same order as question.options
  answeredCount: number;
  playerCount: number;
}

export interface GameState {
  gameId: string; // namespaces players/answers in Redis, new on every lobby open/reset
  quizId: string;
  status: GameStatus;
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  winnerRevealPhase: WinnerRevealPhase;
  lastReveal: RevealSummary | null;
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
  correctCount: number;
  rank: number;
  previousRank: number | null; // rank before the latest question, for movement arrows
}

// ─── Questions & quizzes ───────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'truefalse';

export interface Question {
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  funFact?: string; // Shown after reveal
}

// Public version, no correctAnswer
export interface PublicQuestion {
  type: QuestionType;
  text: string;
  options: string[];
}

export interface Quiz {
  id: string;
  title: string; // shown on big screen and join page
  subtitle?: string;
  questionDurationMs: number;
  leaderboardAfterQuestion: number | null; // 0-indexed; null = no mid-game leaderboard
  questions: Question[];
}

export interface QuizInfo {
  id: string;
  title: string;
  subtitle?: string;
  totalQuestions: number;
  questionDurationMs: number;
  leaderboardAfterQuestion: number | null;
}

// ─── API Payloads ──────────────────────────────────────────────────────────────

export type AdminCommand =
  | { type: 'open-lobby' }
  | { type: 'next'; expectedStatus: GameStatus; expectedIndex: number }
  | { type: 'select-quiz'; quizId: string }
  | { type: 'reset' };

export interface MyStatus {
  id: string;
  name: string;
  totalScore: number;
  rank: number | null; // null while hidden to keep the podium a surprise
  playerCount: number;
  streak: number; // consecutive correct answers up to the latest revealed question
  currentAnswer: string | null; // answer locked in for the active question
  lastResult: { questionIndex: number; answer: string | null; correct: boolean; points: number } | null;
}

export interface GameStateResponse {
  serverNow: number;
  gameId: string;
  status: GameStatus;
  quiz: QuizInfo;
  currentQuestionIndex: number;
  question: PublicQuestion | null;
  questionEndsAt: number | null;
  players: { id: string; name: string }[];
  playerCount: number;
  answeredCount: number;
  reveal: RevealSummary | null;
  leaderboard: ScoreEntry[] | null;
  isFinalLeaderboard: boolean;
  winnerRevealPhase: WinnerRevealPhase;
  canJoin: boolean;
  me: MyStatus | null;
}

export interface AdminInfoResponse {
  quizzes: QuizInfo[];
  currentQuestion: Question | null;
}

// ─── Pusher Events ─────────────────────────────────────────────────────────────
// Server state is the single source of truth. Pusher only tells clients to refetch,
// plus a lightweight answer counter so we don't refetch on every single answer.

export interface PusherStateChanged {
  status: GameStatus;
  index: number;
}

export interface PusherAnswerCount {
  questionIndex: number;
  answered: number;
  total: number;
}
