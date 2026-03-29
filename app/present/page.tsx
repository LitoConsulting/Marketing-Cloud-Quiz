'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useGameState, GameEvent } from '@/hooks/useGameState';
import {
  PusherAnswerRevealed,
  PusherLeaderboard,
  PusherQuestion,
  PusherWinnerReveal,
} from '@/lib/types';

// ─── Waiting / Lobby Screen ─────────────────────────────────────────────────────

function WaitingScreen({ players, playerCount }: { players: { id: string; name: string }[]; playerCount: number }) {
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center mb-12">
        <div className="mb-4">
          <Image src="/quiz-icon.png" alt="Quiz" width={112} height={112} className="mx-auto" />
        </div>
        <h1 className="text-white text-6xl font-black tracking-tight">Marketing Cloud Meetup Quiz</h1>
        <p className="text-white/40 text-xl mt-2">Scan to join!</p>
      </div>

      <div className="flex gap-16 items-start">
        {/* QR Code */}
        <div className="text-center">
          <div className="bg-white p-4 rounded-2xl inline-block mb-3">
            <QRCodeSVG value={joinUrl} size={180} />
          </div>
          <p className="text-white/40 text-sm">Scan to join</p>
          <p className="text-white/20 text-xs mt-1">{joinUrl}</p>
        </div>

        {/* Player list */}
        <div className="min-w-[280px]">
          <div className="text-cyan-400 text-sm uppercase tracking-widest mb-4 font-semibold">
            {playerCount} player{playerCount !== 1 ? 's' : ''} joined
          </div>
          <div className="space-y-2 max-h-96 overflow-hidden">
            {players.slice(0, 12).map((p, i) => (
              <div
                key={p.id}
                className="glass text-white px-4 py-2 rounded-xl text-lg font-medium animate-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {p.name}
              </div>
            ))}
            {playerCount > 12 && (
              <div className="text-white/30 text-sm px-4">+{playerCount - 12} more...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Question Display ───────────────────────────────────────────────────────────

const OPTION_COLORS = ['bg-rose-600', 'bg-blue-600', 'bg-amber-500', 'bg-emerald-600'];
const OPTION_ICONS = ['▲', '◆', '●', '■'];

function QuestionDisplay({
  questionData,
  answeredCount,
  totalPlayers,
}: {
  questionData: PusherQuestion;
  answeredCount: number;
  totalPlayers: number;
}) {
  const { question, index, endsAt } = questionData;
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    const tick = () => setTimeLeft(Math.max(0, (endsAt - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAt]);

  const progress = timeLeft / 15;
  const timerColor = progress > 0.5 ? '#22d3ee' : progress > 0.25 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 34;

  return (
    <div className="min-h-screen flex flex-col p-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-white/40 text-xl font-semibold">
          Question <span className="text-white font-black">{index + 1}</span> / 10
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-sm">{answeredCount}/{totalPlayers} answered</span>
          {/* Timer circle */}
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
            <span className="text-white text-2xl font-black relative z-10">
              {Math.ceil(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* Question text */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="glass rounded-3xl p-10 mb-8">
          <p className="text-white text-4xl font-bold leading-tight text-center">{question.text}</p>
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-2 gap-4">
          {question.options.map((option, i) => (
            <div
              key={option}
              className={`${OPTION_COLORS[i] ?? 'bg-white/10'} rounded-2xl px-6 py-6 flex items-center gap-4`}
            >
              <span className="text-white/70 text-xl font-bold w-6">{OPTION_ICONS[i]}</span>
              <span className="text-white text-2xl font-semibold">{option}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Answer Reveal (present) ────────────────────────────────────────────────────

function AnswerRevealScreen({ revealData }: { revealData: PusherAnswerRevealed }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10">
      <div className="text-6xl mb-6">✅</div>
      <h2 className="text-white/40 text-xl mb-2 uppercase tracking-widest">Correct answer</h2>
      <div className="text-white text-5xl font-black mb-8 text-center">{revealData.correctAnswer}</div>
      {revealData.funFact && (
        <div className="glass rounded-2xl p-8 max-w-3xl text-center">
          <div className="text-cyan-400 text-sm uppercase tracking-wide mb-3">Did you know?</div>
          <p className="text-white/80 text-xl leading-relaxed">{revealData.funFact}</p>
        </div>
      )}
    </div>
  );
}

// ─── Leaderboard ────────────────────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉', ''];
const RANK_COLORS = ['text-amber-400', 'text-white/70', 'text-amber-700', 'text-white/40'];

function LeaderboardScreen({ data }: { data: PusherLeaderboard }) {
  const top = data.scores.slice(0, 5);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (data.trigger === 'final') return;
    setVisibleCount(0);
    top.forEach((_, i) => {
      setTimeout(() => setVisibleCount(i + 1), i * 200 + 300);
    });
  }, [data]); // eslint-disable-line

  // Final leaderboard: simple transition screen, no scores revealed
  if (data.trigger === 'final') {
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
      <h2 className="text-white text-4xl font-black mb-2">Halfway Leaderboard</h2>
      <p className="text-white/40 mb-10">5 questions to go!</p>
      <div className="w-full max-w-xl space-y-3">
        {top.map((entry, i) => (
          <div
            key={entry.playerId}
            className="glass rounded-2xl px-6 py-4 flex items-center gap-4"
            style={{
              transform: visibleCount > i ? 'translateX(0)' : 'translateX(-60px)',
              opacity: visibleCount > i ? 1 : 0,
              transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
            }}
          >
            <span className="text-3xl w-8">{RANK_MEDALS[i] ?? ''}</span>
            <span className={`text-2xl font-black w-8 ${RANK_COLORS[i] ?? 'text-white/40'}`}>
              {entry.rank}
            </span>
            <span className="text-white text-xl font-semibold flex-1">{entry.name}</span>
            <span className="text-cyan-400 text-xl font-bold">{entry.totalScore} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Winner Reveal ──────────────────────────────────────────────────────────────

function useSlideIn(trigger: unknown) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [trigger]);
  return visible;
}

function WinnerRevealScreen({ data }: { data: PusherWinnerReveal }) {
  const { phase, entry, allScores } = data;
  const visible = useSlideIn(phase);
  const firedConfetti = useRef(false);

  useEffect(() => {
    if (phase !== 'rank1' || firedConfetti.current) return;
    firedConfetti.current = true;

    const duration = 5000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22d3ee', '#a855f7', '#ec4899', '#f59e0b', '#22c55e'],
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22d3ee', '#a855f7', '#ec4899', '#f59e0b', '#22c55e'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [phase]);

  const slideStyle: React.CSSProperties = {
    transform: visible ? 'translateY(0)' : 'translateY(80px)',
    opacity: visible ? 1 : 0,
    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
  };

  if (phase === 'start') {
    const others = (allScores ?? []).filter((s) => s.rank > 3).sort((a, b) => a.rank - b.rank);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10" style={slideStyle}>
        <h2 className="text-white text-5xl font-black mb-2 text-center">Amazing effort, everyone!</h2>
        <p className="text-white/40 text-xl mb-10">Special shoutout to our top participants:</p>
        {others.length > 0 ? (
          <div className="w-full max-w-2xl space-y-3">
            {others.map((s, i) => (
              <div
                key={s.playerId}
                className="glass rounded-2xl px-6 py-3 flex items-center gap-4"
                style={{
                  opacity: 0,
                  animation: `fadeSlideIn 0.4s ease forwards`,
                  animationDelay: `${i * 120}ms`,
                }}
              >
                <span className="text-white/30 text-lg font-bold w-8">#{s.rank}</span>
                <span className="text-white text-xl font-semibold flex-1">{s.name}</span>
                <span className="text-white/40 text-lg">{s.totalScore} pts</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-lg">Only 3 players: straight to the podium!</p>
        )}
        <p className="text-cyan-400 text-lg mt-10 font-semibold">Now for the podium...</p>
      </div>
    );
  }

  if ((phase === 'rank3' || phase === 'rank2') && entry) {
    const isPodium3 = phase === 'rank3';
    const medal = isPodium3 ? '🥉' : '🥈';
    const place = isPodium3 ? '3rd Place' : '2nd Place';
    const nameColor = isPodium3 ? 'text-amber-600' : 'text-white/80';
    const scoreColor = isPodium3 ? 'text-amber-700' : 'text-white/60';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={slideStyle}>
        <div className="text-9xl mb-6">{medal}</div>
        <p className={`text-2xl font-bold uppercase tracking-widest mb-6 ${scoreColor}`}>{place}</p>
        <h2 className={`text-8xl font-black mb-4 text-center px-8 ${nameColor}`}>{entry.name}</h2>
        <p className="text-white/40 text-3xl font-bold">{entry.totalScore} points</p>
      </div>
    );
  }

  if (phase === 'rank1' && entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={slideStyle}>
        <div className="text-9xl mb-4">👑</div>
        <p className="text-amber-400 text-3xl font-black uppercase tracking-widest mb-6">
          WINNER!
        </p>
        <h2 className="text-white font-black mb-4 text-center px-8" style={{ fontSize: 'clamp(3rem, 10vw, 7rem)', lineHeight: 1.1 }}>
          {entry.name}
        </h2>
        <p className="text-cyan-400 text-4xl font-bold">{entry.totalScore} points</p>
        <p className="text-white/60 text-2xl mt-8">Congratulations! 🎉</p>
      </div>
    );
  }

  return null;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PresentPage() {
  const [view, setView] = useState<'lobby' | 'question' | 'revealing' | 'leaderboard' | 'winner'>('lobby');
  const [currentQuestion, setCurrentQuestion] = useState<PusherQuestion | null>(null);
  const [revealData, setRevealData] = useState<PusherAnswerRevealed | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<PusherLeaderboard | null>(null);
  const [winnerData, setWinnerData] = useState<PusherWinnerReveal | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  function handleEvent(event: GameEvent) {
    switch (event.type) {
      case 'game-opened':
        setView('lobby');
        break;
      case 'question':
        setCurrentQuestion(event.data);
        setAnsweredCount(0);
        setView('question');
        break;
      case 'answer-count':
        setAnsweredCount(event.data.answered);
        break;
      case 'answer-revealed':
        setRevealData(event.data);
        setView('revealing');
        break;
      case 'leaderboard':
        setLeaderboardData(event.data);
        setView('leaderboard');
        break;
      case 'winner-reveal':
        setWinnerData(event.data);
        setView('winner');
        break;
    }
  }

  const { gameState } = useGameState(handleEvent);

  useEffect(() => {
    if (!gameState) return;
    const s = gameState.status;
    if (s === 'lobby' || s === 'idle') setView('lobby');
    else if (s === 'question') setView('question');
    else if (s === 'revealing') setView('revealing');
    else if (s === 'leaderboard') setView('leaderboard');
    else if (s === 'winner-reveal') setView('winner');
  }, [gameState?.status]); // eslint-disable-line

  const players = gameState?.players ?? [];
  const totalPlayers = gameState?.playerCount ?? 0;

  if (view === 'lobby' || !gameState) {
    return <WaitingScreen players={players} playerCount={totalPlayers} />;
  }
  if (view === 'question' && currentQuestion) {
    return <QuestionDisplay questionData={currentQuestion} answeredCount={answeredCount} totalPlayers={totalPlayers} />;
  }
  if (view === 'revealing' && revealData) {
    return <AnswerRevealScreen revealData={revealData} />;
  }
  if (view === 'leaderboard' && leaderboardData) {
    return <LeaderboardScreen data={leaderboardData} />;
  }
  if (view === 'winner' && winnerData) {
    return <WinnerRevealScreen data={winnerData} />;
  }

  return <WaitingScreen players={players} playerCount={totalPlayers} />;
}
