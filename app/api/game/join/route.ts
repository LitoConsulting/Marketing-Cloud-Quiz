import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getGameState, getAllPlayers, setPlayer, playerNameExists } from '@/lib/redis';
import { pusherServer, GAME_CHANNEL } from '@/lib/pusher-server';
import { Player } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { name } = await req.json();

  const trimmed = (name ?? '').trim();
  if (!trimmed || trimmed.length > 20) {
    return NextResponse.json({ error: 'Name must be 1-20 characters' }, { status: 400 });
  }

  const state = await getGameState();
  if (state.status !== 'lobby') {
    return NextResponse.json({ error: 'Game is not accepting players right now' }, { status: 400 });
  }

  if (await playerNameExists(trimmed)) {
    return NextResponse.json({ error: 'That name is already taken' }, { status: 400 });
  }

  const playerId = nanoid(10);
  const player: Player = {
    id: playerId,
    name: trimmed,
    joinedAt: Date.now(),
    totalScore: 0,
    answers: {},
  };

  await setPlayer(player);

  const allPlayers = await getAllPlayers();
  await pusherServer.trigger(GAME_CHANNEL, 'game:player-joined', {
    players: allPlayers.map((p) => ({ id: p.id, name: p.name })),
  });

  const res = NextResponse.json({ ok: true, playerId, playerName: trimmed });
  res.cookies.set('player_id', playerId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 4,
    path: '/',
  });
  res.cookies.set('player_name', trimmed, {
    sameSite: 'lax',
    maxAge: 60 * 60 * 4,
    path: '/',
  });
  return res;
}
