'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import { EVENT_CONFIG } from '@/lib/event-config';
import { GameStateResponse, PusherAnswerCount } from '@/lib/types';

export const PLAYER_ID_KEY = 'quiz_player_id';

interface Options {
  /** Send this tab's player id so the response includes `me` */
  asPlayer?: boolean;
  /** Refetch on every join (big screen and admin show the player list) */
  watchPlayers?: boolean;
}

/**
 * The server state is the single source of truth. Every view is derived from it,
 * so a reloaded phone or projector lands on the right screen straight away.
 * Pusher just makes updates instant; polling and refetch-on-wake cover the gaps.
 */
export function useGameState({ asPlayer = false, watchPlayers = false }: Options = {}) {
  const [state, setState] = useState<GameStateResponse | null>(null);
  const clockOffset = useRef(0); // serverTime - deviceTime, phones' clocks are often off
  const requestSeq = useRef(0);
  const appliedSeq = useRef(0);

  const fetchState = useCallback(async () => {
    const seq = ++requestSeq.current;
    const headers: Record<string, string> = {};
    if (asPlayer) {
      try {
        const id = sessionStorage.getItem(PLAYER_ID_KEY);
        if (id) headers['X-Player-Id'] = id;
      } catch {
        // sessionStorage unavailable, the cookie still identifies the player
      }
    }
    const sentAt = Date.now();
    try {
      const res = await fetch('/api/game/state', { headers, cache: 'no-store' });
      if (!res.ok) return;
      const data: GameStateResponse = await res.json();
      // Ignore responses that arrive after a newer one
      if (seq < appliedSeq.current) return;
      appliedSeq.current = seq;
      const receivedAt = Date.now();
      clockOffset.current = data.serverNow - (sentAt + receivedAt) / 2;
      setState(data);
    } catch {
      // Network blip, the next poll retries
    }
  }, [asPlayer]);

  const serverNow = useCallback(() => Date.now() + clockOffset.current, []);

  // Polling fallback + refetch when a phone wakes up or reconnects
  useEffect(() => {
    fetchState();
    const pollMs = getPusherClient() ? 4000 : 1500;
    const interval = setInterval(fetchState, pollMs);
    const onWake = () => {
      if (document.visibilityState === 'visible') fetchState();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [fetchState]);

  // Real-time nudges
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe('quiz-game');
    channel.bind('game:state', () => fetchState());
    channel.bind('game:player-joined', (data: { playerCount: number }) => {
      if (watchPlayers) fetchState();
      else setState((prev) => (prev ? { ...prev, playerCount: data.playerCount } : prev));
    });
    channel.bind('game:answer-count', (data: PusherAnswerCount) => {
      setState((prev) =>
        prev && prev.status === 'question' && prev.currentQuestionIndex === data.questionIndex
          ? { ...prev, answeredCount: Math.max(prev.answeredCount, data.answered), playerCount: data.total }
          : prev
      );
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe('quiz-game');
    };
  }, [fetchState, watchPlayers]);

  // When the timer runs out the server auto-reveals on the next request, so make that request right away
  const endsAt = state?.status === 'question' ? state.questionEndsAt : null;
  useEffect(() => {
    if (!endsAt) return;
    const delay = endsAt + EVENT_CONFIG.answerGraceMs + 300 - serverNow();
    const t = setTimeout(fetchState, Math.max(0, delay));
    return () => clearTimeout(t);
  }, [endsAt, fetchState, serverNow]);

  return { state, serverNow, refetch: fetchState };
}

/** Seconds left on the active question, corrected for the device's clock offset. */
export function useCountdown(endsAt: number | null | undefined, serverNow: () => number): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [endsAt]);
  // Computed during render so a brand new question never flashes a stale "time's up"
  return endsAt ? Math.max(0, (endsAt - serverNow()) / 1000) : 0;
}
