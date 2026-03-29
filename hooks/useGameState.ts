'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import {
  GameStateResponse,
  PusherPlayerJoined,
  PusherQuestion,
  PusherAnswerRevealed,
  PusherLeaderboard,
  PusherWinnerReveal,
} from '@/lib/types';

export type GameEvent =
  | { type: 'player-joined'; data: PusherPlayerJoined }
  | { type: 'question'; data: PusherQuestion }
  | { type: 'answer-revealed'; data: PusherAnswerRevealed }
  | { type: 'leaderboard'; data: PusherLeaderboard }
  | { type: 'winner-reveal'; data: PusherWinnerReveal }
  | { type: 'game-opened' };

export function useGameState(onEvent?: (event: GameEvent) => void) {
  const [gameState, setGameState] = useState<GameStateResponse | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/game/state');
      if (res.ok) setGameState(await res.json());
    } catch {
      // Network error — ignore, will retry
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe('quiz-game');

    channel.bind('game:player-joined', (data: PusherPlayerJoined) => {
      setGameState((prev) => prev ? { ...prev, players: data.players, playerCount: data.players.length } : prev);
      onEventRef.current?.({ type: 'player-joined', data });
    });

    channel.bind('game:opened', () => {
      fetchState();
      onEventRef.current?.({ type: 'game-opened' });
    });

    channel.bind('game:question', (data: PusherQuestion) => {
      setGameState((prev) => prev
        ? { ...prev, status: 'question', currentQuestionIndex: data.index, question: data.question, questionEndsAt: data.endsAt }
        : prev
      );
      onEventRef.current?.({ type: 'question', data });
    });

    channel.bind('game:answer-revealed', (data: PusherAnswerRevealed) => {
      setGameState((prev) => prev ? { ...prev, status: 'revealing' } : prev);
      onEventRef.current?.({ type: 'answer-revealed', data });
    });

    channel.bind('game:leaderboard', (data: PusherLeaderboard) => {
      setGameState((prev) => prev ? { ...prev, status: 'leaderboard' } : prev);
      onEventRef.current?.({ type: 'leaderboard', data });
    });

    channel.bind('game:winner-reveal', (data: PusherWinnerReveal) => {
      setGameState((prev) => prev ? { ...prev, status: 'winner-reveal', winnerRevealPhase: data.phase } : prev);
      onEventRef.current?.({ type: 'winner-reveal', data });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('quiz-game');
    };
  }, [fetchState]);

  return { gameState, fetchState };
}
