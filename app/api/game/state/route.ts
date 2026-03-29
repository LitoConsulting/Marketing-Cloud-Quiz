import { NextResponse } from 'next/server';
import { getGameState, getAllPlayers } from '@/lib/redis';
import { getPublicQuestion } from '@/lib/questions';
import { GameStateResponse } from '@/lib/types';

export async function GET() {
  const [state, players] = await Promise.all([
    getGameState(),
    getAllPlayers(),
  ]);

  const response: GameStateResponse = {
    status: state.status,
    currentQuestionIndex: state.currentQuestionIndex,
    question: getPublicQuestion(state.currentQuestionIndex),
    players: players.map((p) => ({ id: p.id, name: p.name })),
    questionEndsAt: state.questionEndsAt,
    playerCount: players.length,
    winnerRevealPhase: state.winnerRevealPhase,
  };

  return NextResponse.json(response);
}
