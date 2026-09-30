import { NextRequest, NextResponse } from 'next/server';
import { buildStateResponse } from '@/lib/game';
import { getPlayerId } from '@/lib/player-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const response = await buildStateResponse(getPlayerId(req));
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('GET /api/game/state failed', err);
    return NextResponse.json(
      { error: 'Game server unavailable, see /api/health' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
