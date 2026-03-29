import { Redis } from '@upstash/redis';
import { GameState, Player, PlayerAnswer } from './types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Key helpers ───────────────────────────────────────────────────────────────

const KEYS = {
  state: 'quiz:state',
  players: 'quiz:players',
  answers: (index: number) => `quiz:answers:${index}`,
};

// ─── Game State ────────────────────────────────────────────────────────────────

const DEFAULT_STATE: GameState = {
  status: 'idle',
  currentQuestionIndex: 0,
  questionStartedAt: null,
  questionEndsAt: null,
  winnerRevealPhase: 'idle',
};

export async function getGameState(): Promise<GameState> {
  const raw = await redis.get<GameState>(KEYS.state);
  return raw ?? { ...DEFAULT_STATE };
}

export async function setGameState(state: GameState): Promise<void> {
  await redis.set(KEYS.state, state);
}

// ─── Players ───────────────────────────────────────────────────────────────────

export async function getAllPlayers(): Promise<Player[]> {
  const hash = await redis.hgetall<Record<string, Player>>(KEYS.players);
  if (!hash) return [];
  return Object.values(hash);
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  return redis.hget<Player>(KEYS.players, playerId);
}

export async function setPlayer(player: Player): Promise<void> {
  await redis.hset(KEYS.players, { [player.id]: player });
}

export async function playerNameExists(name: string): Promise<boolean> {
  const players = await getAllPlayers();
  return players.some(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
}

// ─── Answers ───────────────────────────────────────────────────────────────────

export async function getAnswersForQuestion(
  index: number
): Promise<Record<string, PlayerAnswer>> {
  const hash = await redis.hgetall<Record<string, PlayerAnswer>>(KEYS.answers(index));
  return hash ?? {};
}

export async function setAnswer(
  questionIndex: number,
  playerId: string,
  answer: PlayerAnswer
): Promise<void> {
  await redis.hset(KEYS.answers(questionIndex), { [playerId]: answer });
}

export async function hasPlayerAnswered(
  questionIndex: number,
  playerId: string
): Promise<boolean> {
  const answer = await redis.hget(KEYS.answers(questionIndex), playerId);
  return answer !== null;
}

// ─── Reset ─────────────────────────────────────────────────────────────────────

export async function resetGame(): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(KEYS.state, { ...DEFAULT_STATE });
  pipeline.del(KEYS.players);
  for (let i = 0; i < 10; i++) {
    pipeline.del(KEYS.answers(i));
  }
  await pipeline.exec();
}
