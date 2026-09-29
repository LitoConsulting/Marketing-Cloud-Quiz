// Server-side game engine: every state transition goes through here.
import {
  acquireRevealLock,
  countAnswers,
  freshState,
  getAllPlayers,
  getAnswer,
  getAnswersForQuestion,
  getGameState,
  releaseRevealLock,
  savePlayers,
  setGameState,
} from './redis';
import { broadcast } from './pusher-server';
import { getPublicQuestion, getQuiz, toQuizInfo } from './quizzes';
import { nextAction, isLastQuestion } from './flow';
import { EVENT_CONFIG } from './event-config';
import {
  GameState,
  GameStateResponse,
  MyStatus,
  Player,
  ScoreEntry,
  WinnerRevealPhase,
} from './types';

async function saveAndNotify(state: GameState): Promise<void> {
  await setGameState(state);
  await broadcast('game:state', { status: state.status, index: state.currentQuestionIndex });
}

// ─── Leaderboard ───────────────────────────────────────────────────────────────

function scoreUpTo(player: Player, lastIndex: number): { score: number; correct: number } {
  let score = 0;
  let correct = 0;
  for (const [idx, a] of Object.entries(player.answers ?? {})) {
    if (Number(idx) > lastIndex) continue;
    score += Number(a.score) || 0;
    if (a.correct) correct += 1;
  }
  return { score, correct };
}

function rankPlayers(players: Player[], lastIndex: number): Map<string, number> {
  const sorted = players
    .map((p) => ({ p, ...scoreUpTo(p, lastIndex) }))
    // Ties: more correct answers first, then whoever joined first
    .sort((a, b) => b.score - a.score || b.correct - a.correct || a.p.joinedAt - b.p.joinedAt);
  return new Map(sorted.map((s, i) => [s.p.id, i + 1]));
}

/** Full ranking after the latest revealed question, including each player's rank one question earlier. */
export function buildLeaderboard(players: Player[], lastRevealedIndex: number): ScoreEntry[] {
  const current = rankPlayers(players, lastRevealedIndex);
  const previous = lastRevealedIndex > 0 ? rankPlayers(players, lastRevealedIndex - 1) : null;
  return players
    .map((p) => {
      const { score, correct } = scoreUpTo(p, lastRevealedIndex);
      return {
        playerId: p.id,
        name: p.name,
        totalScore: score,
        correctCount: correct,
        rank: current.get(p.id)!,
        previousRank: previous?.get(p.id) ?? null,
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

// ─── Transitions ───────────────────────────────────────────────────────────────

function startQuestion(state: GameState, index: number): GameState {
  const quiz = getQuiz(state.quizId);
  const now = Date.now();
  return {
    ...state,
    status: 'question',
    currentQuestionIndex: index,
    questionStartedAt: now,
    questionEndsAt: now + quiz.questionDurationMs,
    lastReveal: null,
  };
}

/**
 * Closes the active question: tallies the answer distribution and writes the answers onto the players.
 * Safe to call from several places at once (host button, timer expiry, last answer in) - only one wins.
 */
export async function revealCurrentQuestion(): Promise<boolean> {
  const state = await getGameState();
  if (state.status !== 'question' || state.questionStartedAt === null) return false;
  const idx = state.currentQuestionIndex;
  if (!(await acquireRevealLock(state.gameId, idx, state.questionStartedAt))) return false;

  try {
    await tallyAndReveal(state);
  } catch (err) {
    // Never leave a question stuck behind a lock: let the next request (or the host) retry
    await releaseRevealLock(state.gameId, idx, state.questionStartedAt).catch(() => {});
    throw err;
  }
  return true;
}

async function tallyAndReveal(state: GameState): Promise<void> {
  const idx = state.currentQuestionIndex;
  const quiz = getQuiz(state.quizId);
  const question = quiz.questions[idx];
  const [answers, players] = await Promise.all([
    getAnswersForQuestion(state.gameId, idx),
    getAllPlayers(state.gameId),
  ]);

  const distribution = question.options.map(
    (opt) => Object.values(answers).filter((a) => a.answer === opt).length
  );

  for (const player of players) {
    player.answers = player.answers ?? {};
    const answer = answers[player.id];
    if (answer) player.answers[idx] = answer;
    // Recomputed from all answers rather than incremented, so it can never drift
    player.totalScore = scoreUpTo(player, idx).score;
  }
  await savePlayers(state.gameId, players);

  await saveAndNotify({
    ...state,
    status: 'revealing',
    lastReveal: {
      questionIndex: idx,
      correctAnswer: question.correctAnswer,
      funFact: question.funFact,
      distribution,
      answeredCount: Object.keys(answers).length,
      playerCount: players.length,
    },
  });
}

/** Lazy server-side timer: Vercel has no background jobs, so any request after the deadline triggers the reveal. */
export async function autoRevealIfExpired(state: GameState): Promise<GameState> {
  if (
    EVENT_CONFIG.autoReveal &&
    state.status === 'question' &&
    state.questionEndsAt !== null &&
    Date.now() > state.questionEndsAt + EVENT_CONFIG.answerGraceMs
  ) {
    await revealCurrentQuestion();
    return getGameState();
  }
  return state;
}

export async function openLobby(): Promise<GameState> {
  const current = await getGameState();
  const state: GameState = { ...freshState(current.quizId), status: 'lobby' };
  await saveAndNotify(state);
  return state;
}

export async function resetGame(): Promise<void> {
  const current = await getGameState();
  await saveAndNotify(freshState(current.quizId));
}

export async function selectQuiz(quizId: string): Promise<{ error?: string }> {
  const state = await getGameState();
  if (!['idle', 'lobby', 'finished'].includes(state.status)) {
    return { error: 'Can only switch quiz before the game starts' };
  }
  if (getQuiz(quizId).id !== quizId) return { error: 'Unknown quiz' };
  await saveAndNotify({ ...state, quizId });
  return {};
}

/** Advances the game one step. `expected*` guards against a double tap skipping a question. */
export async function advance(expectedStatus: string, expectedIndex: number): Promise<{ error?: string }> {
  const state = await getGameState();
  if (state.status !== expectedStatus || state.currentQuestionIndex !== expectedIndex) {
    return { error: 'The game already moved on' };
  }
  const quiz = toQuizInfo(getQuiz(state.quizId));
  const players = await getAllPlayers(state.gameId);
  const action = nextAction(state, quiz, players.length);

  switch (action.kind) {
    case 'start-question':
      await saveAndNotify(startQuestion(state, action.index));
      return {};
    case 'reveal':
      await revealCurrentQuestion();
      return {};
    case 'leaderboard':
      await saveAndNotify({ ...state, status: 'leaderboard' });
      return {};
    case 'winner-phase':
      await saveAndNotify({ ...state, status: 'winner-reveal', winnerRevealPhase: action.phase });
      return {};
    case 'finish':
      await saveAndNotify({ ...state, status: 'finished' });
      return {};
    default:
      return { error: 'Nothing to advance' };
  }
}

export function canJoin(state: GameState): boolean {
  if (state.status === 'lobby' || state.status === 'question' || state.status === 'revealing') return true;
  // Late joiners are welcome until the final leaderboard
  return state.status === 'leaderboard' && !isLastQuestion(state.currentQuestionIndex, toQuizInfo(getQuiz(state.quizId)));
}

// ─── Public state ──────────────────────────────────────────────────────────────

const PODIUM_RANK: Record<WinnerRevealPhase, number> = { idle: 4, start: 4, rank3: 3, rank2: 2, rank1: 1 };

/** Lowest rank number already shown on the big screen (4 = only the non-podium places). */
function revealedFromRank(state: GameState): number {
  if (state.status === 'finished') return 1;
  if (state.status === 'winner-reveal') return PODIUM_RANK[state.winnerRevealPhase];
  return Infinity;
}

function lastRevealedIndex(state: GameState): number {
  return state.status === 'question' || state.status === 'lobby' || state.status === 'idle'
    ? state.currentQuestionIndex - 1
    : state.currentQuestionIndex;
}

function currentStreak(player: Player, upTo: number): number {
  let streak = 0;
  for (let i = upTo; i >= 0; i--) {
    if (player.answers?.[i]?.correct) streak += 1;
    else break;
  }
  return streak;
}

export async function buildStateResponse(myId: string | null): Promise<GameStateResponse> {
  const state = await autoRevealIfExpired(await getGameState());
  const quiz = getQuiz(state.quizId);
  const quizInfo = toQuizInfo(quiz);
  const idx = state.currentQuestionIndex;
  const inQuestion = state.status === 'question';

  const [players, liveAnswered, myAnswer] = await Promise.all([
    getAllPlayers(state.gameId),
    inQuestion ? countAnswers(state.gameId, idx) : Promise.resolve(0),
    inQuestion && myId ? getAnswer(state.gameId, idx, myId) : Promise.resolve(null),
  ]);

  const revealedIdx = lastRevealedIndex(state);
  const ranking = buildLeaderboard(players, revealedIdx);
  const fromRank = revealedFromRank(state);
  const podiumTime = state.status === 'winner-reveal' || state.status === 'finished';

  let leaderboard: ScoreEntry[] | null = null;
  if (state.status === 'leaderboard' && !isLastQuestion(idx, quizInfo)) {
    leaderboard = ranking.slice(0, 5);
  } else if (podiumTime) {
    // Only send places that are already revealed, so peeking at the API can't spoil the podium
    leaderboard = ranking
      .filter((e) => e.rank <= 3 + EVENT_CONFIG.honorableMentions)
      .filter((e) => e.rank >= fromRank);
  }

  let me: MyStatus | null = null;
  const player = myId ? players.find((p) => p.id === myId) : undefined;
  if (player) {
    const entry = ranking.find((e) => e.playerId === player.id)!;
    const lateInQuiz = idx >= quizInfo.totalQuestions - EVENT_CONFIG.hideRankForLastQuestions;
    const rankHidden =
      ((state.status === 'question' || state.status === 'revealing') && lateInQuiz) ||
      (state.status === 'leaderboard' && isLastQuestion(idx, quizInfo)) ||
      (podiumTime && entry.rank < fromRank);
    const result = state.status === 'revealing' ? player.answers?.[idx] : undefined;
    me = {
      id: player.id,
      name: player.name,
      totalScore: entry.totalScore,
      rank: rankHidden ? null : entry.rank,
      playerCount: players.length,
      streak: currentStreak(player, revealedIdx),
      currentAnswer: myAnswer?.answer ?? null,
      lastResult:
        state.status === 'revealing'
          ? {
              questionIndex: idx,
              answer: result?.answer ?? null,
              correct: Boolean(result?.correct),
              points: Number(result?.score) || 0,
            }
          : null,
    };
  }

  const showQuestion = inQuestion || state.status === 'revealing';
  return {
    serverNow: Date.now(),
    gameId: state.gameId,
    status: state.status,
    quiz: quizInfo,
    currentQuestionIndex: idx,
    question: showQuestion ? getPublicQuestion(quiz, idx) : null,
    questionEndsAt: inQuestion ? state.questionEndsAt : null,
    players: players
      .slice()
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({ id: p.id, name: p.name })),
    playerCount: players.length,
    answeredCount: inQuestion ? liveAnswered : state.lastReveal?.answeredCount ?? 0,
    reveal: state.status === 'revealing' && state.lastReveal?.questionIndex === idx ? state.lastReveal : null,
    leaderboard,
    isFinalLeaderboard: state.status === 'leaderboard' && isLastQuestion(idx, quizInfo),
    winnerRevealPhase: state.winnerRevealPhase,
    canJoin: canJoin(state),
    me,
  };
}
