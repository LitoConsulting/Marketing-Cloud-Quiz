import { NextRequest, NextResponse } from 'next/server';
import { getGameState, hasPlayerAnswered, setAnswer, setPlayer, getPlayer, getAllPlayers } from '@/lib/redis';
import { pusherServer, ADMIN_CHANNEL, GAME_CHANNEL } from '@/lib/pusher-server';
import { QUESTIONS } from '@/lib/questions';
import { calculateScore } from '@/lib/scoring';

export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('player_id')?.value;
  if (!playerId) {
    return NextResponse.json({ error: 'Not joined' }, { status: 400 });
  }

  const { answer } = await req.json();
  if (!answer || typeof answer !== 'string') {
    return NextResponse.json({ error: 'Invalid answer' }, { status: 400 });
  }

  const state = await getGameState();
  if (state.status !== 'question' || state.questionStartedAt === null) {
    return NextResponse.json({ error: 'No active question' }, { status: 400 });
  }

  const { currentQuestionIndex, questionStartedAt } = state;

  if (await hasPlayerAnswered(currentQuestionIndex, playerId)) {
    return NextResponse.json({ received: true }); // Already answered — idempotent
  }

  const question = QUESTIONS[currentQuestionIndex];
  const isCorrect = answer === question.correctAnswer;
  const score = calculateScore(Date.now(), questionStartedAt, isCorrect);

  await setAnswer(currentQuestionIndex, playerId, {
    answer,
    answeredAt: Date.now(),
    score,
    correct: isCorrect,
  });

  // Count how many have answered
  const allPlayers = await getAllPlayers();
  const answeredCount = (await Promise.all(
    allPlayers.map((p) => hasPlayerAnswered(currentQuestionIndex, p.id))
  )).filter(Boolean).length;

  const allAnswered = answeredCount === allPlayers.length;

  // Broadcast to both admin and present screen
  await Promise.all([
    pusherServer.trigger(ADMIN_CHANNEL, 'admin:answer-update', {
      questionIndex: currentQuestionIndex,
      answered: answeredCount,
      total: allPlayers.length,
      allAnswered,
    }),
    pusherServer.trigger(GAME_CHANNEL, 'game:answer-count', {
      questionIndex: currentQuestionIndex,
      answered: answeredCount,
      total: allPlayers.length,
    }),
  ]);

  return NextResponse.json({ received: true });
}
