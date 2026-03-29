'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useGameState } from '@/hooks/useGameState';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const router = useRouter();
  const { gameState } = useGameState();

  useEffect(() => {
    if (joined && gameState?.status === 'question') {
      router.push('/play');
    }
  }, [joined, gameState?.status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/game/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      return;
    }

    sessionStorage.setItem('quiz_player_id', data.playerId);
    setJoined(true);
    router.push('/play');
  }

  const status = gameState?.status;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="mb-3">
          <Image src="/quiz-icon.png" alt="Quiz" width={64} height={64} className="mx-auto" />
        </div>
        <h1 className="text-white text-3xl font-extrabold tracking-tight">Marketing Cloud Meetup Quiz</h1>
        <p className="text-white/40 text-sm mt-1">Welcome! Enter your name to join.</p>
      </div>

      {status === 'idle' && (
        <div className="glass rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-white/60">The quiz has not started yet.</p>
          <p className="text-white/30 text-sm mt-1">Check back in a moment.</p>
        </div>
      )}

      {(status === 'question' || status === 'revealing' || status === 'leaderboard' || status === 'winner-reveal') && (
        <div className="glass rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-amber-400 font-semibold">Game in progress</p>
          <p className="text-white/40 text-sm mt-1">Join next time!</p>
        </div>
      )}

      {status === 'lobby' && (
        <div className="glass rounded-2xl p-8 w-full max-w-sm">
          <h2 className="text-white text-xl font-bold mb-1">Join the quiz</h2>
          <p className="text-white/40 text-sm mb-6">Enter your name to join</p>
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
            {gameState?.playerCount ?? 0} player{gameState?.playerCount !== 1 ? 's' : ''} waiting
          </p>
        </div>
      )}

      {!status && (
        <div className="text-white/20 text-sm">Connecting...</div>
      )}
    </div>
  );
}
