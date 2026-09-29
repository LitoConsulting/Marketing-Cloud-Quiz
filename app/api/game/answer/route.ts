import { NextRequest, NextResponse } from 'next/server';
import { countAnswers, countPlayers, getGameState, getPlayer, recordAnswer } from '@/lib/redis';
import { broadcast } from '@/lib/pusher-server';
import { getQuiz } from '@/lib/quizzes';
import { calculateScore } from '@/lib/scoring';
import { revealCurrentQuestion } from '@/lib/game';
import { EVENT_CONFIG } from '@/lib/event-config';
import { getPlayerId } from '@/lib/player-id';
import { PusherAnswerCount } from '@/lib/types';

export async function POST(req: NextRequest) {
  const now = Date.now();
  const playerId = getPlayerId(req);
  if (!playerId) {
    return NextResponse.json({ error: 'Not joined' }, { status: 400 });
  }

  const { answer } = await req.json();
  if (!answer || typeof answer !== 'string') {
    return NextResponse.json({ error: 'Invalid answer' }, { status: 400 });
  }

  const state = await getGameState();
  if (state.status !== 'question' || state.questionStartedAt === null || state.questionEndsAt === null) {
    return NextResponse.json({ error: 'No active question' }, { status: 400 });
  }
  if (now > state.questionEndsAt + EVENT_CONFIG.answerGraceMs) {
    return NextResponse.json({ error: "Time's up!" }, { status: 400 });
  }

  const { gameId, currentQuestionIndex: idx, questionStartedAt } = state;
  const quiz = getQuiz(state.quizId);
  const question = quiz.questions[idx];
  if (!question.options.includes(answer)) {
    return NextResponse.json({ error: 'Invalid answer' }, { status: 400 });
  }
  if (!(await getPlayer(gameId, playerId))) {
    return NextResponse.json({ error: 'Not joined' }, { status: 400 });
  }

  const correct = answer === question.correctAnswer;
  const recorded = await recordAnswer(gameId, idx, playerId, {
    answer,
    answeredAt: now,
    score: calculateScore(now - questionStartedAt, quiz.questionDurationMs, correct),
    correct,
  });
  if (!recorded) {
    return NextResponse.json({ received: true }); // Already answered, double tap is harmless
  }

  const [answered, total] = await Promise.all([countAnswers(gameId, idx), countPlayers(gameId)]);
  const count: PusherAnswerCount = { questionIndex: idx, answered, total };
  await broadcast('game:answer-count', count);

  if (EVENT_CONFIG.autoReveal && answered >= total) {
    await revealCurrentQuestion();
  }

  return NextResponse.json({ received: true });
}
