import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';
import { GameState, Player, PlayerAnswer } from './types';
import { DEFAULT_QUIZ_ID } from './quizzes';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Players and answers are namespaced per game and expire on their own,
// so a reset never has to know how many questions the last quiz had.
const GAME_TTL_SECONDS = 60 * 60 * 24;

// ─── Key helpers ───────────────────────────────────────────────────────────────

const KEYS = {
  state: 'quiz:state',
  players: (gameId: string) => `quiz:${gameId}:players`,
  names: (gameId: string) => `quiz:${gameId}:names`,
  answers: (gameId: string, index: number) => `quiz:${gameId}:answers:${index}`,
  revealLock: (gameId: string, index: number, startedAt: number) =>
    `quiz:${gameId}:lock:reveal:${index}:${startedAt}`,
};

// ─── Game State ────────────────────────────────────────────────────────────────

export function freshState(quizId: string = DEFAULT_QUIZ_ID): GameState {
  return {
    gameId: nanoid(8),
    quizId,
    status: 'idle',
    currentQuestionIndex: 0,
    questionStartedAt: null,
    questionEndsAt: null,
    winnerRevealPhase: 'idle',
    lastReveal: null,
  };
}

export async function getGameState(): Promise<GameState> {
  const raw = await redis.get<GameState>(KEYS.state);
  // A state saved by an older version of the app has no gameId, start over cleanly
  if (!raw || !raw.gameId) {
    const state = freshState();
    await setGameState(state);
    return state;
  }
  return raw;
}

export async function setGameState(state: GameState): Promise<void> {
  await redis.set(KEYS.state, state);
}

// ─── Players ───────────────────────────────────────────────────────────────────

export async function getAllPlayers(gameId: string): Promise<Player[]> {
  const hash = await redis.hgetall<Record<string, Player>>(KEYS.players(gameId));
  if (!hash) return [];
  return Object.values(hash);
}

export async function getPlayer(gameId: string, playerId: string): Promise<Player | null> {
  return redis.hget<Player>(KEYS.players(gameId), playerId);
}

export async function countPlayers(gameId: string): Promise<number> {
  return redis.hlen(KEYS.players(gameId));
}

/** Adds the player unless the name is taken (case-insensitive). Atomic, so two phones can't grab the same name. */
export async function addPlayerIfNameFree(gameId: string, player: Player): Promise<boolean> {
  const claimed = await redis.hsetnx(KEYS.names(gameId), player.name.toLowerCase(), player.id);
  if (!claimed) return false;
  const p = redis.pipeline();
  p.hset(KEYS.players(gameId), { [player.id]: player });
  p.expire(KEYS.players(gameId), GAME_TTL_SECONDS);
  p.expire(KEYS.names(gameId), GAME_TTL_SECONDS);
  await p.exec();
  return true;
}

export async function savePlayers(gameId: string, players: Player[]): Promise<void> {
  if (players.length === 0) return;
  await redis.hset(KEYS.players(gameId), Object.fromEntries(players.map((p) => [p.id, p])));
}

// ─── Answers ───────────────────────────────────────────────────────────────────

export async function getAnswersForQuestion(
  gameId: string,
  index: number
): Promise<Record<string, PlayerAnswer>> {
  const hash = await redis.hgetall<Record<string, PlayerAnswer>>(KEYS.answers(gameId, index));
  return hash ?? {};
}

export async function getAnswer(gameId: string, index: number, playerId: string): Promise<PlayerAnswer | null> {
  return redis.hget<PlayerAnswer>(KEYS.answers(gameId, index), playerId);
}

/** Records the first answer only. Returns false if the player already answered (double tap). */
export async function recordAnswer(
  gameId: string,
  index: number,
  playerId: string,
  answer: PlayerAnswer
): Promise<boolean> {
  const recorded = await redis.hsetnx(KEYS.answers(gameId, index), playerId, JSON.stringify(answer));
  if (recorded) await redis.expire(KEYS.answers(gameId, index), GAME_TTL_SECONDS);
  return recorded === 1;
}

export async function countAnswers(gameId: string, index: number): Promise<number> {
  return redis.hlen(KEYS.answers(gameId, index));
}

// ─── Locks ─────────────────────────────────────────────────────────────────────

/** Makes sure a question is revealed exactly once, even if the host and the auto-reveal race. */
export async function acquireRevealLock(gameId: string, index: number, startedAt: number): Promise<boolean> {
  const res = await redis.set(KEYS.revealLock(gameId, index, startedAt), 1, { nx: true, ex: 30 });
  return res === 'OK';
}

export async function releaseRevealLock(gameId: string, index: number, startedAt: number): Promise<void> {
  await redis.del(KEYS.revealLock(gameId, index, startedAt));
}
