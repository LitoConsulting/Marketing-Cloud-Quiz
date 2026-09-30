'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useCountdown, useGameState } from '@/hooks/useGameState';
import { OPTION_COLORS, OPTION_HEX, OPTION_ICONS, formatPoints } from '@/components/options';
import { sounds, unlockAudio } from '@/lib/sound';
import { GameStateResponse, ScoreEntry } from '@/lib/types';
import { ConnectionNotice } from '@/components/ConnectionNotice';

const CONFETTI_COLORS = ['#22d3ee', '#a855f7', '#ec4899', '#f59e0b', '#22c55e'];

function useJoinUrl() {
  const [url, setUrl] = useState(process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/` : '');
  useEffect(() => setUrl(`${window.location.origin}/`), []);
  return url;
}

// ─── Sound toggle ──────────────────────────────────────────────────────────────

function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 glass rounded-full px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
    >
      {enabled ? '🔊 Sound on' : '🔇 Click for sound'}
    </button>
  );
}

// ─── Lobby ─────────────────────────────────────────────────────────────────────

function LobbyScreen({ state }: { state: GameStateResponse }) {
  const joinUrl = useJoinUrl();
  const open = state.status === 'lobby';
  const shown = state.players.slice(-24);
  const hidden = state.playerCount - shown.length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10">
      <div className="text-center mb-12">
        <Image src="/quiz-icon.png" alt="" width={96} height={96} className="mx-auto mb-4" />
        {state.quiz.subtitle && (
          <p className="text-cyan-400 text-lg uppercase tracking-[0.3em] font-semibold mb-3">{state.quiz.subtitle}</p>
        )}
        <h1 className="text-white text-6xl font-black tracking-tight text-balance">{state.quiz.title}</h1>
      </div>

      <div className="flex gap-16 items-start">
        <div className="text-center shrink-0">
          <div className={`bg-white p-4 rounded-2xl inline-block mb-3 transition-opacity ${open ? '' : 'opacity-30'}`}>
            {joinUrl && <QRCodeSVG value={joinUrl} size={220} />}
          </div>
          <p className="text-white text-xl font-bold">{open ? 'Scan to join!' : 'Opening soon...'}</p>
          <p className="text-white/40 text-sm mt-1">{joinUrl.replace(/^https?:\/\//, '')}</p>
        </div>

        <div className="w-[520px]">
          <div className="text-cyan-400 text-sm uppercase tracking-widest mb-4 font-semibold">
            {state.playerCount} player{state.playerCount !== 1 ? 's' : ''} joined
          </div>
          <div className="flex flex-wrap gap-2">
            {shown.map((p) => (
              <div key={p.id} className="glass text-white px-4 py-2 rounded-xl text-lg font-medium"
                style={{ animation: 'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                {p.name}
              </div>
            ))}
            {hidden > 0 && <div className="text-white/30 text-lg px-4 py-2">+{hidden} more</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Question ──────────────────────────────────────────────────────────────────

function QuestionScreen({ state, timeLeft }: { state: GameStateResponse; timeLeft: number }) {
  const question = state.question!;
  const durationS = state.quiz.questionDurationMs / 1000;
  const progress = Math.min(1, timeLeft / durationS);
  const timerColor = progress > 0.5 ? '#22d3ee' : progress > 0.25 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 34;
  const allIn = state.playerCount > 0 && state.answeredCount >= state.playerCount;
  const closed = timeLeft <= 0 || allIn;
  const joinLabel = useJoinUrlLabel();

  return (
    <div className="min-h-screen flex flex-col p-10">
      <div className="flex items-center justify-between mb-8">
        <div className="text-white/40 text-xl font-semibold">
          Question <span className="text-white font-black">{state.currentQuestionIndex + 1}</span> / {state.quiz.totalQuestions}
        </div>
        <div className="flex items-center gap-6 mr-40">
          <div className="text-right">
            <div className="text-white text-3xl font-black tabular-nums">{state.answeredCount}<span className="text-white/30">/{state.playerCount}</span></div>
            <div className="text-white/40 text-xs uppercase tracking-widest">answered</div>
          </div>
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg width="80" height="80" className="absolute -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke={timerColor}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.5s' }}
              />
            </svg>
            <span className="text-white text-2xl font-black relative z-10 tabular-nums">{Math.ceil(timeLeft)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center relative">
        <div className="glass rounded-3xl p-10 mb-8">
          <p className="text-white text-4xl font-bold leading-tight text-center text-balance">{question.text}</p>
        </div>

        <div className={`grid grid-cols-2 gap-4 transition-opacity ${closed ? 'opacity-40' : ''}`}>
          {question.options.map((option, i) => (
            <div key={option} className={`${OPTION_COLORS[i] ?? 'bg-white/10'} rounded-2xl px-6 py-6 flex items-center gap-4`}>
              <span className="text-white/70 text-xl font-bold w-6">{OPTION_ICONS[i]}</span>
              <span className="text-white text-2xl font-semibold">{option}</span>
            </div>
          ))}
        </div>

        {closed && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
            <div className="glass rounded-full px-10 py-4 text-3xl font-black text-white"
              style={{ animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', background: 'rgba(8,13,26,0.85)' }}>
              {allIn ? "Everyone's in! 🙌" : "Time's up! ⏰"}
            </div>
          </div>
        )}
      </div>

      {state.canJoin && (
        <p className="text-white/20 text-sm text-center mt-6">Late? Join at {joinLabel}</p>
      )}
    </div>
  );
}

function useJoinUrlLabel() {
  return useJoinUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// ─── Answer reveal with distribution ───────────────────────────────────────────

function RevealScreen({ state }: { state: GameStateResponse }) {
  const question = state.question!;
  const reveal = state.reveal!;
  const total = Math.max(1, reveal.answeredCount);
  const correctCount = reveal.distribution[question.options.indexOf(reveal.correctAnswer)] ?? 0;
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-center p-10 max-w-6xl mx-auto w-full">
      <p className="text-white/50 text-2xl font-semibold text-center mb-8 text-balance">{question.text}</p>

      <div className="space-y-3 mb-8">
        {question.options.map((option, i) => {
          const count = reveal.distribution[i] ?? 0;
          const pct = Math.round((count / total) * 100);
          const isCorrect = option === reveal.correctAnswer;
          return (
            <div key={option}
              className={`relative rounded-2xl overflow-hidden flex items-center gap-4 px-6 py-5 transition-opacity duration-500 ${isCorrect ? 'ring-4 ring-emerald-400' : 'opacity-50'}`}
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out"
                style={{ width: grown ? `${pct}%` : '0%', background: OPTION_HEX[i], opacity: 0.85 }} />
              <span className="relative text-white/80 text-xl font-bold w-6">{OPTION_ICONS[i]}</span>
              <span className="relative text-white text-2xl font-semibold flex-1">{option}</span>
              {isCorrect && <span className="relative text-3xl">✅</span>}
              <span className="relative text-white text-2xl font-black tabular-nums w-28 text-right">
                {count} <span className="text-white/60 text-lg font-bold">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-white/40 text-lg mb-6">
        {correctCount} of {reveal.playerCount} got it right
        {reveal.answeredCount < reveal.playerCount && ` · ${reveal.playerCount - reveal.answeredCount} didn't answer`}
      </p>

      {reveal.funFact && (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-cyan-400 text-sm uppercase tracking-widest mb-3 font-semibold">Did you know?</div>
          <p className="text-white/85 text-2xl leading-relaxed text-balance">{reveal.funFact}</p>
        </div>
      )}
    </div>
  );
}

// ─── Leaderboard ───────────────────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function Movement({ entry }: { entry: ScoreEntry }) {
  if (entry.previousRank === null || entry.previousRank === entry.rank) {
    return <span className="text-white/20 text-lg w-14 text-center">-</span>;
  }
  const up = entry.previousRank > entry.rank;
  return (
    <span className={`text-lg font-bold w-14 text-center ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(entry.previousRank - entry.rank)}
    </span>
  );
}

function LeaderboardScreen({ state }: { state: GameStateResponse }) {
  const top = state.leaderboard ?? [];
  const left = state.quiz.totalQuestions - state.currentQuestionIndex - 1;

  if (state.isFinalLeaderboard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
        <div className="text-8xl mb-8">🎯</div>
        <h2 className="text-white text-6xl font-black mb-4">That&apos;s a wrap!</h2>
        <p className="text-white/40 text-2xl">Get ready for the podium reveal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10">
      <div className="text-5xl mb-4">🏆</div>
      <h2 className="text-white text-5xl font-black mb-2">Halfway Leaderboard</h2>
      <p className="text-white/40 text-xl mb-10">{left} question{left !== 1 ? 's' : ''} to go!</p>
      <div className="w-full max-w-2xl space-y-3">
        {top.map((entry, i) => (
          <div key={entry.playerId}
            className="glass rounded-2xl px-6 py-4 flex items-center gap-4"
            style={{ opacity: 0, animation: 'fadeSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', animationDelay: `${300 + i * 200}ms` }}>
            <span className="text-3xl w-10">{RANK_MEDALS[i] ?? ''}</span>
            <span className="text-2xl font-black w-8 text-white/50">{entry.rank}</span>
            <span className="text-white text-2xl font-semibold flex-1 truncate">{entry.name}</span>
            <Movement entry={entry} />
            <span className="text-cyan-400 text-2xl font-bold tabular-nums">{formatPoints(entry.totalScore)}</span>
          </div>
        ))}
        {top.length === 0 && <p className="text-white/30 text-center text-lg">No players yet!</p>}
      </div>
    </div>
  );
}

// ─── Winner reveal ─────────────────────────────────────────────────────────────

function fireConfetti(durationMs: number) {
  const end = Date.now() + durationMs;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: CONFETTI_COLORS });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: CONFETTI_COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

const slideIn: React.CSSProperties = { animation: 'fadeSlideIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both' };

function WinnerRevealScreen({ state }: { state: GameStateResponse }) {
  const phase = state.winnerRevealPhase;
  const entries = state.leaderboard ?? [];
  const byRank = (r: number) => entries.find((e) => e.rank === r);

  useEffect(() => {
    if (phase === 'rank1') fireConfetti(5000);
  }, [phase]);

  if (phase === 'start') {
    const others = entries.filter((e) => e.rank > 3);
    return (
      <div key="start" className="min-h-screen flex flex-col items-center justify-center p-10" style={slideIn}>
        <h2 className="text-white text-5xl font-black mb-2 text-center">Amazing effort, everyone!</h2>
        {others.length > 0 ? (
          <>
            <p className="text-white/40 text-xl mb-10">A big shoutout to our top players:</p>
            <div className="w-full max-w-2xl space-y-3">
              {others.map((s, i) => (
                <div key={s.playerId} className="glass rounded-2xl px-6 py-3 flex items-center gap-4"
                  style={{ opacity: 0, animation: 'fadeSlideIn 0.4s ease forwards', animationDelay: `${i * 150}ms` }}>
                  <span className="text-white/30 text-xl font-bold w-10">#{s.rank}</span>
                  <span className="text-white text-2xl font-semibold flex-1 truncate">{s.name}</span>
                  <span className="text-white/40 text-xl tabular-nums">{formatPoints(s.totalScore)} pts</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-white/40 text-xl mt-4">Let&apos;s see who made the podium...</p>
        )}
        {others.length > 0 && (
          <p className="text-cyan-400 text-2xl mt-10 font-semibold animate-pulse">Now for the podium...</p>
        )}
      </div>
    );
  }

  const rank = phase === 'rank3' ? 3 : phase === 'rank2' ? 2 : 1;
  const entry = byRank(rank);
  if (!entry) return null;

  if (rank === 1) {
    return (
      <div key="rank1" className="min-h-screen flex flex-col items-center justify-center" style={slideIn}>
        <div className="text-9xl mb-4">👑</div>
        <p className="text-amber-400 text-3xl font-black uppercase tracking-widest mb-6">Winner!</p>
        <h2 className="text-white font-black mb-4 text-center px-8" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', lineHeight: 1.05 }}>
          {entry.name}
        </h2>
        <p className="text-cyan-400 text-4xl font-bold">{formatPoints(entry.totalScore)} points</p>
        <p className="text-white/50 text-2xl mt-6">{entry.correctCount} of {state.quiz.totalQuestions} correct · Congratulations! 🎉</p>
      </div>
    );
  }

  return (
    <div key={phase} className="min-h-screen flex flex-col items-center justify-center" style={slideIn}>
      <div className="text-9xl mb-6">{RANK_MEDALS[rank - 1]}</div>
      <p className={`text-2xl font-bold uppercase tracking-widest mb-6 ${rank === 3 ? 'text-amber-700' : 'text-white/60'}`}>
        {rank === 3 ? '3rd' : '2nd'} Place
      </p>
      <h2 className={`text-8xl font-black mb-4 text-center px-8 ${rank === 3 ? 'text-amber-600' : 'text-white/85'}`}>{entry.name}</h2>
      <p className="text-white/40 text-3xl font-bold">{formatPoints(entry.totalScore)} points</p>
    </div>
  );
}

function FinalPodiumScreen({ state }: { state: GameStateResponse }) {
  const entries = state.leaderboard ?? [];
  const podium = [2, 1, 3].map((r) => entries.find((e) => e.rank === r));
  const heights: Record<number, string> = { 1: 'h-72', 2: 'h-52', 3: 'h-40' };

  useEffect(() => {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10">
      <h2 className="text-white text-5xl font-black mb-2">Final Podium</h2>
      <p className="text-white/40 text-xl mb-14">{state.quiz.title}</p>
      <div className="flex items-end gap-6">
        {podium.map((entry, i) =>
          entry ? (
            <div key={entry.playerId} className="flex flex-col items-center w-64" style={{ ...slideIn, animationDelay: `${i * 150}ms` }}>
              <div className="text-6xl mb-3">{RANK_MEDALS[entry.rank - 1]}</div>
              <div className="text-white text-3xl font-black text-center mb-1 truncate w-full">{entry.name}</div>
              <div className="text-cyan-400 text-xl font-bold mb-4">{formatPoints(entry.totalScore)} pts</div>
              <div className={`glass w-full rounded-t-2xl ${heights[entry.rank]} flex items-start justify-center pt-4`}
                style={entry.rank === 1 ? { borderColor: 'rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.08)' } : undefined}>
                <span className="text-white/30 text-5xl font-black">{entry.rank}</span>
              </div>
            </div>
          ) : null
        )}
      </div>
      <p className="text-white/50 text-2xl mt-12">Thanks for playing! 💙</p>
    </div>
  );
}

// ─── Sound effects driven by state changes ─────────────────────────────────────

function useSoundEffects(state: GameStateResponse | null, timeLeft: number, enabled: boolean) {
  const lastKey = useRef('');
  const lastTick = useRef<number | null>(null);
  const lastCount = useRef(0);
  const closedFor = useRef('');

  const key = state ? `${state.gameId}:${state.status}:${state.currentQuestionIndex}:${state.winnerRevealPhase}` : '';
  useEffect(() => {
    if (!state || key === lastKey.current) return;
    const first = lastKey.current === '';
    lastKey.current = key;
    if (!enabled || first) return;
    if (state.status === 'question') sounds.whoosh();
    else if (state.status === 'revealing') sounds.reveal();
    else if (state.status === 'leaderboard') sounds.podium();
    else if (state.status === 'winner-reveal') {
      if (state.winnerRevealPhase === 'rank1') sounds.winner();
      else sounds.podium();
    }
    else if (state.status === 'finished') sounds.winner();
  }, [key, state, enabled]);

  // Countdown ticks for the last 5 seconds, then a buzzer (or "everyone's in")
  const secs = Math.ceil(timeLeft);
  const questionKey = state?.status === 'question' ? `${state.gameId}:${state.currentQuestionIndex}` : '';
  const allIn = state?.status === 'question' && state.playerCount > 0 && state.answeredCount >= state.playerCount;
  useEffect(() => {
    if (!enabled || !questionKey) return;
    if ((secs === 0 || allIn) && closedFor.current !== questionKey) {
      closedFor.current = questionKey;
      sounds.timeUp();
    } else if (secs > 0 && secs <= 5 && !allIn && lastTick.current !== secs) {
      sounds.tick();
    }
    lastTick.current = secs;
  }, [secs, questionKey, allIn, enabled]);

  // Little blip when someone joins the lobby
  const count = state?.playerCount ?? 0;
  useEffect(() => {
    if (enabled && state?.status === 'lobby' && count > lastCount.current) sounds.join();
    lastCount.current = count;
  }, [count, state?.status, enabled]);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PresentPage() {
  const { state, serverNow, connectionProblem } = useGameState({ watchPlayers: true });
  const [soundOn, setSoundOn] = useState(false);
  const timeLeft = useCountdown(state?.status === 'question' ? state.questionEndsAt : null, serverNow);
  useSoundEffects(state, timeLeft, soundOn);

  async function toggleSound() {
    if (soundOn) return setSoundOn(false);
    setSoundOn(await unlockAudio());
  }

  let view: React.ReactNode = null;
  if (!state) {
    view = <ConnectionNotice problem={connectionProblem} />;
  } else if (state.status === 'question' && state.question) {
    view = <QuestionScreen state={state} timeLeft={timeLeft} />;
  } else if (state.status === 'revealing' && state.question && state.reveal) {
    view = <RevealScreen key={state.currentQuestionIndex} state={state} />;
  } else if (state.status === 'leaderboard') {
    view = <LeaderboardScreen state={state} />;
  } else if (state.status === 'winner-reveal') {
    view = <WinnerRevealScreen state={state} />;
  } else if (state.status === 'finished') {
    view = <FinalPodiumScreen state={state} />;
  } else {
    view = <LobbyScreen state={state} />;
  }

  return (
    <>
      <SoundToggle enabled={soundOn} onToggle={toggleSound} />
      {view}
    </>
  );
}
