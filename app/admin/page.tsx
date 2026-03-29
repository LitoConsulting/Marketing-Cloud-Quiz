'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameStateResponse, AdminCommand } from '@/lib/types';

// ─── Admin Login ────────────────────────────────────────────────────────────────

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
    } else {
      setError('Wrong password');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-2">Quiz Admin</h1>
        <p className="text-gray-400 text-sm mb-6">Enter admin password to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-violet-500"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Admin Panel ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  idle: 'Not started',
  lobby: 'Lobby open',
  question: 'Question active',
  revealing: 'Showing answer',
  leaderboard: 'Leaderboard',
  'winner-reveal': 'Winner reveal',
  finished: 'Finished',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-gray-700 text-gray-300',
  lobby: 'bg-blue-900 text-blue-300',
  question: 'bg-green-900 text-green-300',
  revealing: 'bg-yellow-900 text-yellow-300',
  leaderboard: 'bg-purple-900 text-purple-300',
  'winner-reveal': 'bg-orange-900 text-orange-300',
  finished: 'bg-gray-700 text-gray-400',
};

function AdminPanel() {
  const [gameState, setGameState] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/game/state');
    if (res.ok) setGameState(await res.json());
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  async function sendCommand(command: AdminCommand) {
    setLoading(true);
    await fetch('/api/game/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    await fetchState();
    setLoading(false);
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const { status, currentQuestionIndex, players, playerCount } = gameState;

  function PrimaryButton({ label, command, color = 'violet' }: {
    label: string;
    command: AdminCommand;
    color?: 'violet' | 'green' | 'orange';
  }) {
    const colors = {
      violet: 'bg-violet-600 hover:bg-violet-500',
      green: 'bg-green-600 hover:bg-green-500',
      orange: 'bg-orange-600 hover:bg-orange-500',
    };
    return (
      <button
        onClick={() => sendCommand(command)}
        disabled={loading}
        className={`${colors[color]} disabled:opacity-50 text-white font-bold rounded-xl px-6 py-4 text-lg transition-colors w-full`}
      >
        {loading ? '...' : label}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold">Quiz Admin</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-700 text-gray-300'}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Players</div>
            <div className="text-white text-3xl font-bold">{playerCount}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Question</div>
            <div className="text-white text-3xl font-bold">
              {status === 'lobby' || status === 'idle' ? '-' : `${Math.min(currentQuestionIndex + 1, 10)}/10`}
            </div>
          </div>
        </div>

        {/* Primary Action */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 space-y-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide">Action</div>

          {status === 'idle' && (
            <PrimaryButton label="Open Lobby" command={{ type: 'open-game' }} color="green" />
          )}
          {status === 'lobby' && (
            <PrimaryButton label={`Start Quiz (${playerCount} players)`} command={{ type: 'start-quiz' }} color="green" />
          )}
          {status === 'question' && (
            <PrimaryButton label="Reveal Answer" command={{ type: 'reveal-answers' }} color="orange" />
          )}
          {status === 'revealing' && (
            <PrimaryButton label="Next Question" command={{ type: 'next-question' }} />
          )}
          {status === 'leaderboard' && currentQuestionIndex < 10 && (
            <PrimaryButton label="Continue to Next Question" command={{ type: 'advance-leaderboard' }} color="green" />
          )}
          {status === 'leaderboard' && currentQuestionIndex >= 10 && (
            <PrimaryButton label="Start Winner Reveal" command={{ type: 'start-winner-reveal' }} color="orange" />
          )}
          {status === 'winner-reveal' && (
            <PrimaryButton label="Next Reveal Step" command={{ type: 'advance-winner' }} color="orange" />
          )}
          {status === 'finished' && (
            <div className="text-center text-gray-400 py-4">Quiz complete!</div>
          )}
        </div>

        {/* Player list */}
        {players.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-xs uppercase tracking-wide mb-3">Players joined</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {players.map((p) => (
                <div key={p.id} className="text-white text-sm py-1 border-b border-gray-800 last:border-0">
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="text-red-400 hover:text-red-300 text-sm w-full text-left"
            >
              Reset game
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-red-400 text-sm">All data will be wiped. Are you sure?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { sendCommand({ type: 'reset-game' }); setConfirmReset(false); }}
                  className="bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg px-4 py-2"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/check')
      .then((res) => res.json())
      .then((data) => setAuthed(data.ok));
  }, []);

  if (authed === null) return null;
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;
  return <AdminPanel />;
}
