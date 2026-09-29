import { NextRequest, NextResponse } from 'next/server';
import { buildStateResponse } from '@/lib/game';
import { getPlayerId } from '@/lib/player-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const response = await buildStateResponse(getPlayerId(req));
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}
