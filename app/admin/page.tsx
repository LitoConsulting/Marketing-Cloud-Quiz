'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameStateResponse, AdminCommand, PusherAnswerUpdate } from '@/lib/types';
import { getPusherClient } from '@/lib/pusher-client';

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-2">Quiz Admin</h1>
        <p className="text-white/40 text-sm mb-6">Enter admin password to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500"
            style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
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
  idle: 'bg-white/10 text-white/40',
  lobby: 'bg-blue-900/60 text-blue-300',
  question: 'bg-emerald-900/60 text-emerald-300',
  revealing: 'bg-amber-900/60 text-amber-300',
  leaderboard: 'bg-cyan-900/60 text-cyan-300',
  'winner-reveal': 'bg-orange-900/60 text-orange-300',
  finished: 'bg-white/10 text-white/30',
};

function AdminPanel() {
  const [gameState, setGameState] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [answerUpdate, setAnswerUpdate] = useState<PusherAnswerUpdate | null>(null);

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/game/state');
    if (res.ok) setGameState(await res.json());
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  useEffect(() => {
    const pusher = getPusherClient();
    const adminCh = pusher.subscribe('quiz-admin');
    const gameCh = pusher.subscribe('quiz-game');

    adminCh.bind('admin:answer-update', (data: PusherAnswerUpdate) => {
      setAnswerUpdate(data);
    });

    gameCh.bind('game:question', () => {
      setAnswerUpdate(null);
    });

    return () => {
      adminCh.unbind_all();
      gameCh.unbind_all();
      pusher.unsubscribe('quiz-admin');
      pusher.unsubscribe('quiz-game');
    };
  }, []);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  const { status, currentQuestionIndex, players, playerCount } = gameState;

  function PrimaryButton({ label, command, color = 'cyan' }: {
    label: string;
    command: AdminCommand;
    color?: 'cyan' | 'green' | 'orange';
  }) {
    const colors = {
      cyan: 'bg-cyan-500 hover:bg-cyan-400',
      green: 'bg-emerald-600 hover:bg-emerald-500',
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
    <div className="min-h-screen p-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold">Quiz Admin</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[status] ?? 'bg-white/10 text-white/40'}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Players</div>
            <div className="text-white text-3xl font-bold">{playerCount}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Question</div>
            <div className="text-white text-3xl font-bold">
              {status === 'lobby' || status === 'idle' ? '-' : `${Math.min(currentQuestionIndex + 1, 10)}/10`}
            </div>
          </div>
        </div>

        {/* Live answer count during question */}
        {status === 'question' && (
          <div className="glass rounded-xl p-4" style={{ borderColor: 'rgba(52,211,153,0.3)' }}>
            <div className="text-emerald-400 text-xs uppercase tracking-wide mb-2">Answers received</div>
            <div className="flex items-end gap-2">
              <span className="text-white text-4xl font-black">
                {answerUpdate?.questionIndex === currentQuestionIndex ? answerUpdate.answered : 0}
              </span>
              <span className="text-white/30 text-xl mb-1">/ {playerCount}</span>
            </div>
            {answerUpdate?.allAnswered && (
              <div className="text-emerald-400 text-sm mt-2 font-semibold">All players answered!</div>
            )}
          </div>
        )}

        {/* Primary Action */}
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="text-white/40 text-xs uppercase tracking-wide">Action</div>

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
            <PrimaryButton
              label={
                currentQuestionIndex === 4 ? 'Show Leaderboard' :
                currentQuestionIndex >= 9 ? 'Show Final Leaderboard' :
                'Next Question'
              }
              command={{ type: 'next-question' }}
            />
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
            <div className="text-center text-white/40 py-4">Quiz complete!</div>
          )}
        </div>

        {/* Player list */}
        {players.length > 0 && (
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-3">Players joined</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {players.map((p) => (
                <div key={p.id} className="text-white text-sm py-1 border-b border-white/[0.06] last:border-0">
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="glass rounded-xl p-4">
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
                  className="text-white/60 hover:text-white text-sm rounded-lg px-4 py-2"
                  style={{ background: 'var(--input)' }}
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
