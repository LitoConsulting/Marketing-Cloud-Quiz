import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import {
  getGameState,
  setGameState,
  getAllPlayers,
  getAnswersForQuestion,
  resetGame,
} from '@/lib/redis';
import { pusherServer, GAME_CHANNEL } from '@/lib/pusher-server';
import { QUESTIONS, getPublicQuestion, TOTAL_QUESTIONS, LEADERBOARD_AFTER_QUESTION, QUESTION_DURATION_MS } from '@/lib/questions';
import { AdminCommand, GameState, ScoreEntry, WinnerRevealPhase } from '@/lib/types';

function buildLeaderboard(players: Awaited<ReturnType<typeof getAllPlayers>>): ScoreEntry[] {
  return players
    .map((p) => ({ playerId: p.id, name: p.name, totalScore: Number(p.totalScore) || 0, rank: 0 }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { command }: { command: AdminCommand } = await req.json();
  const state = await getGameState();

  switch (command.type) {
    case 'open-game': {
      if (state.status !== 'idle' && state.status !== 'finished') {
        return NextResponse.json({ error: 'Game already open' }, { status: 400 });
      }
      const newState: GameState = {
        ...state,
        status: 'lobby',
        currentQuestionIndex: 0,
        questionStartedAt: null,
        questionEndsAt: null,
        winnerRevealPhase: 'idle',
      };
      await setGameState(newState);
      await pusherServer.trigger(GAME_CHANNEL, 'game:opened', {});
      return NextResponse.json({ ok: true });
    }

    case 'start-quiz': {
      if (state.status !== 'lobby') {
        return NextResponse.json({ error: 'Game not in lobby' }, { status: 400 });
      }
      const now = Date.now();
      const newState: GameState = {
        ...state,
        status: 'question',
        currentQuestionIndex: 0,
        questionStartedAt: now,
        questionEndsAt: now + QUESTION_DURATION_MS,
      };
      await setGameState(newState);
      await pusherServer.trigger(GAME_CHANNEL, 'game:question', {
        index: 0,
        question: getPublicQuestion(0),
        endsAt: newState.questionEndsAt,
      });
      return NextResponse.json({ ok: true });
    }

    case 'reveal-answers': {
      if (state.status !== 'question') {
        return NextResponse.json({ error: 'No active question' }, { status: 400 });
      }
      const { currentQuestionIndex } = state;
      const question = QUESTIONS[currentQuestionIndex];
      const answers = await getAnswersForQuestion(currentQuestionIndex);
      const players = await getAllPlayers();

      // Update player total scores — use Number() to guard against Redis string coercion
      for (const player of players) {
        const answer = answers[player.id];
        player.totalScore = Number(player.totalScore) || 0;
        if (answer) {
          player.totalScore += Number(answer.score) || 0;
          player.answers[currentQuestionIndex] = answer;
        }
      }
      // Persist updated scores
      const { setPlayer } = await import('@/lib/redis');
      await Promise.all(players.map((p) => setPlayer(p)));

      const scores = buildLeaderboard(players);

      await setGameState({ ...state, status: 'revealing' });
      await pusherServer.trigger(GAME_CHANNEL, 'game:answer-revealed', {
        index: currentQuestionIndex,
        correctAnswer: question.correctAnswer,
        funFact: question.funFact,
        scores,
      });
      return NextResponse.json({ ok: true });
    }

    case 'next-question': {
      if (state.status !== 'revealing') {
        return NextResponse.json({ error: 'Not in revealing state' }, { status: 400 });
      }
      const nextIndex = state.currentQuestionIndex + 1;

      // After Q5 (index 4): show mid-game leaderboard
      if (state.currentQuestionIndex === LEADERBOARD_AFTER_QUESTION) {
        const players = await getAllPlayers();
        const scores = buildLeaderboard(players);
        await setGameState({ ...state, status: 'leaderboard', currentQuestionIndex: nextIndex });
        await pusherServer.trigger(GAME_CHANNEL, 'game:leaderboard', {
          scores,
          trigger: 'mid',
        });
        return NextResponse.json({ ok: true });
      }

      // After last question: final leaderboard
      if (nextIndex >= TOTAL_QUESTIONS) {
        const players = await getAllPlayers();
        const scores = buildLeaderboard(players);
        await setGameState({ ...state, status: 'leaderboard', currentQuestionIndex: nextIndex });
        await pusherServer.trigger(GAME_CHANNEL, 'game:leaderboard', {
          scores,
          trigger: 'final',
        });
        return NextResponse.json({ ok: true });
      }

      // Normal next question
      const now = Date.now();
      const newState: GameState = {
        ...state,
        status: 'question',
        currentQuestionIndex: nextIndex,
        questionStartedAt: now,
        questionEndsAt: now + QUESTION_DURATION_MS,
      };
      await setGameState(newState);
      await pusherServer.trigger(GAME_CHANNEL, 'game:question', {
        index: nextIndex,
        question: getPublicQuestion(nextIndex),
        endsAt: newState.questionEndsAt,
      });
      return NextResponse.json({ ok: true });
    }

    case 'advance-leaderboard': {
      if (state.status !== 'leaderboard') {
        return NextResponse.json({ error: 'Not showing leaderboard' }, { status: 400 });
      }
      // Resume questions after mid-game leaderboard
      const now = Date.now();
      const idx = state.currentQuestionIndex;
      const newState: GameState = {
        ...state,
        status: 'question',
        questionStartedAt: now,
        questionEndsAt: now + QUESTION_DURATION_MS,
      };
      await setGameState(newState);
      await pusherServer.trigger(GAME_CHANNEL, 'game:question', {
        index: idx,
        question: getPublicQuestion(idx),
        endsAt: newState.questionEndsAt,
      });
      return NextResponse.json({ ok: true });
    }

    case 'start-winner-reveal': {
      if (state.status !== 'leaderboard') {
        return NextResponse.json({ error: 'Not in leaderboard state' }, { status: 400 });
      }
      const players = await getAllPlayers();
      const scores = buildLeaderboard(players);
      const newState: GameState = {
        ...state,
        status: 'winner-reveal',
        winnerRevealPhase: 'start',
      };
      await setGameState(newState);
      await pusherServer.trigger(GAME_CHANNEL, 'game:winner-reveal', {
        phase: 'start',
        allScores: scores,
      });
      return NextResponse.json({ ok: true });
    }

    case 'advance-winner': {
      if (state.status !== 'winner-reveal') {
        return NextResponse.json({ error: 'Not in winner reveal' }, { status: 400 });
      }
      const phases: WinnerRevealPhase[] = ['start', 'rank4', 'rank3', 'rank2', 'rank1'];
      const currentIdx = phases.indexOf(state.winnerRevealPhase);
      const nextPhase = phases[currentIdx + 1];

      if (!nextPhase) {
        await setGameState({ ...state, status: 'finished' });
        return NextResponse.json({ ok: true });
      }

      const players = await getAllPlayers();
      const scores = buildLeaderboard(players);
      const rankMap: Record<WinnerRevealPhase, number> = {
        idle: 0, start: 0, rank4: 4, rank3: 3, rank2: 2, rank1: 1,
      };
      const targetRank = rankMap[nextPhase];
      const entry = scores.find((s) => s.rank === targetRank);

      await setGameState({ ...state, winnerRevealPhase: nextPhase });
      await pusherServer.trigger(GAME_CHANNEL, 'game:winner-reveal', {
        phase: nextPhase,
        entry,
        allScores: scores,
      });
      return NextResponse.json({ ok: true });
    }

    case 'reset-game': {
      await resetGame();
      await pusherServer.trigger(GAME_CHANNEL, 'game:opened', {});
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown command' }, { status: 400 });
  }
}
