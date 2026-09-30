import { NextResponse } from 'next/server';
import { getGameState, pingRedis, redisEnvSource } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Quick diagnostics for event day: open /api/health in a browser.
// Only reports whether settings exist, never their values.
export async function GET() {
  const config = {
    redisEnv: redisEnvSource ?? 'MISSING (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)',
    pusherServer: Boolean(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER),
    pusherClient: Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER),
    adminPassword: Boolean(process.env.ADMIN_PASSWORD),
  };

  let redis = 'ok';
  let gameState = 'ok';
  try {
    await pingRedis();
  } catch (err) {
    redis = describe(err);
  }
  if (redis === 'ok') {
    try {
      const state = await getGameState();
      gameState = `ok (status: ${state.status}, quiz: ${state.quizId})`;
    } catch (err) {
      gameState = describe(err);
    }
  } else {
    gameState = 'skipped, Redis unreachable';
  }

  const ok = redis === 'ok' && gameState.startsWith('ok');
  return NextResponse.json({ ok, config, redis, gameState }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}

function describe(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
    return cause ? `${err.message} (${cause.code ?? cause.message})` : err.message;
  }
  return String(err);
}
