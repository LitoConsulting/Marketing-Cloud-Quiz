'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCountdown, useGameState } from '@/hooks/useGameState';
import { nextAction, nextActionLabel } from '@/lib/flow';
import { EVENT_CONFIG } from '@/lib/event-config';
import { AdminCommand, AdminInfoResponse } from '@/lib/types';

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
    <div className="min-h-screen flex items-center justify-center px-4">
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
  const { state, serverNow, refetch } = useGameState({ watchPlayers: true });
  const [info, setInfo] = useState<AdminInfoResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const timeLeft = useCountdown(state?.status === 'question' ? state.questionEndsAt : null, serverNow);

  const fetchInfo = useCallback(async () => {
    const res = await fetch('/api/game/admin', { cache: 'no-store' });
    if (res.ok) setInfo(await res.json());
  }, []);

  // Host-only data (answer key) follows the question being shown
  const infoKey = state ? `${state.gameId}:${state.status}:${state.currentQuestionIndex}:${state.quiz.id}` : '';
  useEffect(() => {
    if (infoKey) fetchInfo();
  }, [infoKey, fetchInfo]);

  async function sendCommand(command: AdminCommand) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/game/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // 409 = someone (or the auto-reveal) already moved the game on, the refetch below catches up
        if (res.status !== 409) setError(data.error ?? 'Something went wrong');
      }
    } catch {
      setError('Connection problem, try again');
    }
    await refetch();
    setBusy(false);
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  const { status, quiz, currentQuestionIndex, players, playerCount } = state;
  const action = nextAction(state, quiz, playerCount);
  const canPickQuiz = status === 'idle' || status === 'lobby' || status === 'finished';
  const showQuestionNo = !['idle', 'lobby'].includes(status);
  const q = info?.currentQuestion;

  return (
    <div className="min-h-screen p-5 pb-36">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold">Quiz Admin</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[status] ?? 'bg-white/10 text-white/40'}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>

        {/* Quiz picker */}
        <div className="glass rounded-xl p-4">
          <div className="text-white/40 text-xs uppercase tracking-wide mb-2">Quiz</div>
          {canPickQuiz && info ? (
            <div className="space-y-2">
              {info.quizzes.map((qz) => (
                <button
                  key={qz.id}
                  onClick={() => qz.id !== quiz.id && sendCommand({ type: 'select-quiz', quizId: qz.id })}
                  disabled={busy}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                    qz.id === quiz.id ? 'bg-cyan-500/20 text-white ring-1 ring-cyan-400' : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  <span className="font-semibold">{qz.title}</span>
                  <span className="text-white/40"> · {qz.totalQuestions} questions · {qz.questionDurationMs / 1000}s</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-white font-semibold">{quiz.title}</div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Players</div>
            <div className="text-white text-3xl font-bold">{playerCount}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Question</div>
            <div className="text-white text-3xl font-bold">
              {showQuestionNo ? `${Math.min(currentQuestionIndex + 1, quiz.totalQuestions)}/${quiz.totalQuestions}` : '-'}
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
              {status === 'question' ? 'Time' : 'Answered'}
            </div>
            <div className="text-white text-3xl font-bold tabular-nums">
              {status === 'question' ? `${Math.ceil(timeLeft)}s` : status === 'revealing' ? state.answeredCount : '-'}
            </div>
          </div>
        </div>

        {/* Live answer count */}
        {status === 'question' && (
          <div className="glass rounded-xl p-4" style={{ borderColor: 'rgba(52,211,153,0.3)' }}>
            <div className="text-emerald-400 text-xs uppercase tracking-wide mb-2">Answers received</div>
            <div className="flex items-end gap-2">
              <span className="text-white text-4xl font-black">{state.answeredCount}</span>
              <span className="text-white/30 text-xl mb-1">/ {playerCount}</span>
            </div>
            {EVENT_CONFIG.autoReveal && (
              <div className="text-white/40 text-xs mt-2">Auto-reveals when time is up or everyone has answered.</div>
            )}
          </div>
        )}

        {/* Answer key for the host */}
        {q && (
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-2">Answer key</div>
            <p className="text-white text-sm mb-3">{q.text}</p>
            <div className="space-y-1">
              {q.options.map((opt, i) => (
                <div key={opt} className={`text-sm rounded-lg px-3 py-1.5 flex justify-between ${
                  opt === q.correctAnswer ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-white/40'
                }`}>
                  <span>{opt === q.correctAnswer ? '✓ ' : ''}{opt}</span>
                  {state.reveal && <span className="tabular-nums">{state.reveal.distribution[i]}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player list */}
        {players.length > 0 && (
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-3">Players joined</div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {players.map((p) => (
                <span key={p.id} className="text-white text-sm rounded-md px-2 py-1" style={{ background: 'var(--input)' }}>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="glass rounded-xl p-4">
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="text-red-400 hover:text-red-300 text-sm w-full text-left">
              Reset game
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-red-400 text-sm">All players and scores will be wiped. Are you sure?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { sendCommand({ type: 'reset' }); setConfirmReset(false); }}
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
      {/* Primary action, pinned to the bottom so the host never has to scroll for it */}
      <div className="fixed bottom-0 inset-x-0 z-20 px-5 pt-6 pb-5"
        style={{ background: 'linear-gradient(to top, #080d1a 70%, rgba(8,13,26,0))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto space-y-2">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {status === 'finished' && <div className="text-center text-white/40 text-sm">Quiz complete! 🎉</div>}

          {(status === 'idle' || status === 'finished') && (
            <button
              onClick={() => sendCommand({ type: 'open-lobby' })}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl px-6 py-4 text-lg transition-colors w-full shadow-lg"
            >
              {busy ? '...' : status === 'finished' ? 'Open New Lobby' : 'Open Lobby'}
            </button>
          )}

          {action.kind !== 'none' && (
            <button
              onClick={() => sendCommand({ type: 'next', expectedStatus: status, expectedIndex: currentQuestionIndex })}
              disabled={busy || (action.kind === 'start-question' && action.index === 0 && playerCount === 0)}
              className={`${
                action.kind === 'reveal' || action.kind === 'winner-phase' || action.kind === 'finish'
                  ? 'bg-orange-600 hover:bg-orange-500'
                  : 'bg-cyan-500 hover:bg-cyan-400'
              } disabled:opacity-50 text-white font-bold rounded-xl px-6 py-4 text-lg transition-colors w-full shadow-lg`}
            >
              {busy ? '...' : nextActionLabel(action)}
              {action.kind === 'start-question' && action.index === 0 && ` (${playerCount} players)`}
            </button>
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
      .then((data) => setAuthed(data.ok))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return null;
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;
  return <AdminPanel />;
}
