import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { addPlayerIfNameFree, getAllPlayers, getGameState } from '@/lib/redis';
import { broadcast } from '@/lib/pusher-server';
import { canJoin } from '@/lib/game';
import { PLAYER_COOKIE } from '@/lib/player-id';
import { Player } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { name } = await req.json();

  const trimmed = (typeof name === 'string' ? name : '').trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length > 20) {
    return NextResponse.json({ error: 'Name must be 1-20 characters' }, { status: 400 });
  }

  const state = await getGameState();
  if (!canJoin(state)) {
    return NextResponse.json({ error: 'The game is not accepting players right now' }, { status: 400 });
  }

  const player: Player = {
    id: nanoid(10),
    name: trimmed,
    joinedAt: Date.now(),
    totalScore: 0,
    answers: {},
  };

  if (!(await addPlayerIfNameFree(state.gameId, player))) {
    return NextResponse.json({ error: 'That name is already taken' }, { status: 400 });
  }

  const allPlayers = await getAllPlayers(state.gameId);
  await broadcast('game:player-joined', { playerCount: allPlayers.length });

  const res = NextResponse.json({ ok: true, playerId: player.id, playerName: trimmed });
  res.cookies.set(PLAYER_COOKIE, player.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
    path: '/',
  });
  return res;
}
