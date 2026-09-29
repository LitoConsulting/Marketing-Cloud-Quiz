'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useGameState, PLAYER_ID_KEY } from '@/hooks/useGameState';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { state } = useGameState({ asPlayer: true });

  // Already in this game (e.g. scanned the QR code again): go straight back to it
  useEffect(() => {
    if (state?.me) router.replace('/play');
  }, [state?.me, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setLoading(false);
        return;
      }
      try {
        sessionStorage.setItem(PLAYER_ID_KEY, data.playerId);
      } catch {
        // Private mode etc, the cookie still works
      }
      router.push('/play');
    } catch {
      setError('Connection problem, please try again');
      setLoading(false);
    }
  }

  const status = state?.status;
  const inProgress = status && status !== 'lobby' && status !== 'idle';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="mb-3">
          <Image src="/quiz-icon.png" alt="" width={64} height={64} className="mx-auto" />
        </div>
        {state?.quiz.subtitle && (
          <p className="text-cyan-400 text-xs uppercase tracking-[0.2em] font-semibold mb-2">{state.quiz.subtitle}</p>
        )}
        <h1 className="text-white text-3xl font-extrabold tracking-tight text-balance">
          {state?.quiz.title ?? 'Quiz'}
        </h1>
      </div>

      {status === 'idle' && (
        <div className="glass rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-white/60">The quiz has not opened yet.</p>
          <p className="text-white/30 text-sm mt-1">This page updates by itself, hang tight!</p>
        </div>
      )}

      {state && !state.canJoin && inProgress && (
        <div className="glass rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-amber-400 font-semibold">We&apos;re at the grand finale</p>
          <p className="text-white/40 text-sm mt-1">Joining is closed, but enjoy the podium reveal!</p>
        </div>
      )}

      {state?.canJoin && !state.me && (
        <div className="glass rounded-2xl p-8 w-full max-w-sm">
          <h2 className="text-white text-xl font-bold mb-1">
            {inProgress ? 'Jump right in!' : 'Join the quiz'}
          </h2>
          <p className="text-white/40 text-sm mb-6">
            {inProgress
              ? `We're on question ${state.currentQuestionIndex + 1} of ${state.quiz.totalQuestions}. You can still play!`
              : 'Pick a name for the leaderboard'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className="w-full text-white text-lg rounded-xl px-4 py-4 focus:outline-none focus:border-cyan-500 placeholder-white/20"
              style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}
              autoFocus
              autoComplete="off"
              enterKeyHint="go"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-white font-bold text-lg rounded-xl py-4 transition-colors"
            >
              {loading ? 'Joining...' : "Let's go!"}
            </button>
          </form>
          <p className="text-white/20 text-xs text-center mt-4">
            {state.playerCount} player{state.playerCount !== 1 ? 's' : ''} in the game
          </p>
        </div>
      )}

      {!state && <div className="text-white/20 text-sm">Connecting...</div>}
    </div>
  );
}
