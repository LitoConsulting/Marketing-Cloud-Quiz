import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { advance, openLobby, resetGame, selectQuiz } from '@/lib/game';
import { getGameState } from '@/lib/redis';
import { QUIZZES, getQuiz, toQuizInfo } from '@/lib/quizzes';
import { AdminCommand, AdminInfoResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Host-only info: quiz list and the active question including its correct answer
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const state = await getGameState();
  const quiz = getQuiz(state.quizId);
  const showQuestion = state.status === 'question' || state.status === 'revealing';
  const response: AdminInfoResponse = {
    quizzes: QUIZZES.map(toQuizInfo),
    currentQuestion: showQuestion ? quiz.questions[state.currentQuestionIndex] ?? null : null,
  };
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { command }: { command: AdminCommand } = await req.json();

  switch (command?.type) {
    case 'open-lobby': {
      const state = await getGameState();
      if (state.status !== 'idle' && state.status !== 'finished') {
        return NextResponse.json({ error: 'Game already open' }, { status: 400 });
      }
      await openLobby();
      return NextResponse.json({ ok: true });
    }
    case 'next': {
      const { error } = await advance(command.expectedStatus, command.expectedIndex);
      return error ? NextResponse.json({ error }, { status: 409 }) : NextResponse.json({ ok: true });
    }
    case 'select-quiz': {
      const { error } = await selectQuiz(command.quizId);
      return error ? NextResponse.json({ error }, { status: 400 }) : NextResponse.json({ ok: true });
    }
    case 'reset':
      await resetGame();
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: 'Unknown command' }, { status: 400 });
  }
}
