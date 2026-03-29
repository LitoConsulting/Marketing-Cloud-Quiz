'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const router = useRouter();
  const { gameState } = useGameState();

  // If already joined (cookie present) and game starts, redirect to /play
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

    setJoined(true);
    router.push('/play');
  }

  const status = gameState?.status;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo / Title */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">⚡</div>
        <h1 className="text-white text-3xl font-black tracking-tight">MC Quiz</h1>
        <p className="text-gray-400 text-sm mt-1">Marketing Cloud Meetup</p>
      </div>

      {status === 'idle' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-gray-400">The quiz hasn&apos;t started yet.</p>
          <p className="text-gray-500 text-sm mt-1">Check back in a moment.</p>
        </div>
      )}

      {(status === 'question' || status === 'revealing' || status === 'leaderboard' || status === 'winner-reveal') && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-yellow-400 font-semibold">Game in progress</p>
          <p className="text-gray-400 text-sm mt-1">Join next time!</p>
        </div>
      )}

      {status === 'lobby' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
          <h2 className="text-white text-xl font-bold mb-1">Join the quiz</h2>
          <p className="text-gray-400 text-sm mb-6">Enter your name to join</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className="w-full bg-gray-800 text-white text-lg rounded-xl px-4 py-4 border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-600"
              autoFocus
              autoComplete="off"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-lg rounded-xl py-4 transition-colors"
            >
              {loading ? 'Joining...' : "Let's go!"}
            </button>
          </form>
          <p className="text-gray-600 text-xs text-center mt-4">
            {gameState?.playerCount ?? 0} player{gameState?.playerCount !== 1 ? 's' : ''} waiting
          </p>
        </div>
      )}

      {!status && (
        <div className="text-gray-600 text-sm">Connecting...</div>
      )}
    </div>
  );
}
