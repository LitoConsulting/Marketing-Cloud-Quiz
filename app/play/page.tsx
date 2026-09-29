'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCountdown, useGameState, PLAYER_ID_KEY } from '@/hooks/useGameState';
import { OPTION_COLORS, OPTION_ICONS, formatPoints, ordinal } from '@/components/options';
import { GameStateResponse, MyStatus } from '@/lib/types';

// ─── Shared bits ───────────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 text-center">{children}</div>
  );
}

function TopBar({ me }: { me: MyStatus }) {
  return (
    <div className="fixed top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 text-sm backdrop-blur-md"
      style={{ background: 'rgba(8,13,26,0.7)' }}>
      <span className="text-white/60 font-semibold truncate max-w-[55%]">{me.name}</span>
      <span className="text-cyan-400 font-bold">{formatPoints(me.totalScore)} pts</span>
    </div>
  );
}

function RankLine({ me }: { me: MyStatus }) {
  if (me.rank === null) {
    return <p className="text-white/40 text-sm">Rank hidden, the podium awaits 👀</p>;
  }
  return (
    <p className="text-white/70 text-lg">
      You&apos;re <span className="text-white font-black">{ordinal(me.rank)}</span> of {me.playerCount}
    </p>
  );
}

// ─── Views ─────────────────────────────────────────────────────────────────────

function WaitingRoom({ me, playerCount }: { me: MyStatus; playerCount: number }) {
  return (
    <Screen>
      <div className="text-5xl mb-4 animate-pulse">⏳</div>
      <h2 className="text-white text-2xl font-bold mb-2">You&apos;re in, {me.name}!</h2>
      <p className="text-white/40 mb-8">Eyes on the big screen, we start soon.</p>
      <div className="glass rounded-2xl px-8 py-4">
        <div className="text-cyan-400 text-4xl font-black">{playerCount}</div>
        <div className="text-white/30 text-sm mt-1">player{playerCount !== 1 ? 's' : ''} ready</div>
      </div>
    </Screen>
  );
}

function QuestionView({
  state,
  selected,
  timeLeft,
  error,
  onAnswer,
}: {
  state: GameStateResponse;
  selected: string | null;
  timeLeft: number;
  error: string;
  onAnswer: (answer: string) => void;
}) {
  const question = state.question!;
  const durationS = state.quiz.questionDurationMs / 1000;
  const progress = Math.min(1, timeLeft / durationS);
  const color = progress > 0.5 ? '#22d3ee' : progress > 0.25 ? '#f59e0b' : '#ef4444';
  const timeUp = timeLeft <= 0;
  const locked = Boolean(selected) || timeUp;

  return (
    <div className="min-h-screen flex flex-col px-4 pt-16 pb-8">
      <div className="flex items-center justify-between text-xs text-white/40 font-semibold uppercase tracking-widest mb-2">
        <span>Question {state.currentQuestionIndex + 1} / {state.quiz.totalQuestions}</span>
        <span className="tabular-nums">{Math.ceil(timeLeft)}s</span>
      </div>
      <div className="w-full rounded-full h-1.5 mb-5" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-1.5 rounded-full transition-all duration-200" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
      </div>

      <div className="glass rounded-2xl p-5 mb-5">
        <p className="text-white text-lg font-semibold leading-snug">{question.text}</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option, i) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              onClick={() => onAnswer(option)}
              disabled={locked}
              className={`
                ${OPTION_COLORS[i] ?? 'bg-white/10'}
                ${isSelected ? 'ring-4 ring-white ring-offset-2 ring-offset-[#080d1a] scale-[1.02]' : ''}
                ${locked && !isSelected ? 'opacity-30' : ''}
                active:scale-[0.98] disabled:cursor-default text-white font-bold text-base rounded-2xl px-4 py-5
                flex items-center gap-3 text-left transition-all
              `}
            >
              <span className="text-white/70 text-sm w-5 shrink-0">{OPTION_ICONS[i]}</span>
              {option}
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center text-sm min-h-[1.5rem]">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : selected ? (
          <span className="text-white/50 animate-pulse">Locked in ✓ Waiting for the others...</span>
        ) : timeUp ? (
          <span className="text-amber-400 font-semibold">Time&apos;s up! ⏰</span>
        ) : null}
      </div>
    </div>
  );
}

function ResultView({ state, me }: { state: GameStateResponse; me: MyStatus }) {
  const result = me.lastResult;
  const reveal = state.reveal;
  const answered = Boolean(result?.answer);
  const correct = Boolean(result?.correct);

  return (
    <Screen>
      <div className="text-7xl mb-4">{correct ? '🎉' : answered ? '😬' : '⏰'}</div>
      <h2 className={`text-4xl font-black mb-1 ${correct ? 'text-cyan-400' : 'text-red-400'}`}>
        {correct ? 'Correct!' : answered ? 'Not quite!' : 'Too slow!'}
      </h2>
      <p className={`text-2xl font-bold mb-4 ${correct ? 'text-white' : 'text-white/30'}`}>
        +{formatPoints(result?.points ?? 0)} pts
      </p>
      {correct && me.streak >= 2 && (
        <p className="text-amber-400 font-bold mb-4">🔥 {me.streak} in a row!</p>
      )}
      {!correct && reveal && (
        <p className="text-white/40 mb-4 text-sm">
          The answer was <span className="text-white font-semibold">{reveal.correctAnswer}</span>
        </p>
      )}
      <div className="glass rounded-2xl px-6 py-4 mb-6">
        <RankLine me={me} />
      </div>
      {reveal?.funFact && (
        <div className="glass rounded-2xl p-5 max-w-sm text-left">
          <div className="text-cyan-400 text-xs uppercase tracking-widest mb-2 font-semibold">Did you know?</div>
          <p className="text-white/70 text-sm leading-relaxed">{reveal.funFact}</p>
        </div>
      )}
    </Screen>
  );
}

function HalfwayView({ state, me }: { state: GameStateResponse; me: MyStatus }) {
  const left = state.quiz.totalQuestions - state.currentQuestionIndex - 1;
  return (
    <Screen>
      <div className="text-6xl mb-5">🏆</div>
      <h2 className="text-white text-3xl font-black mb-2">Halfway there!</h2>
      <p className="text-white/40 text-sm mb-6">{left} question{left !== 1 ? 's' : ''} to go</p>
      <div className="glass rounded-2xl px-8 py-5">
        <RankLine me={me} />
        <p className="text-cyan-400 text-2xl font-bold mt-2">{formatPoints(me.totalScore)} pts</p>
      </div>
    </Screen>
  );
}

function PodiumWaitView({ me }: { me: MyStatus }) {
  if (me.rank !== null && me.rank <= 3) {
    const medal = ['🥇', '🥈', '🥉'][me.rank - 1];
    return (
      <Screen>
        <div className="text-8xl mb-6">{medal}</div>
        <h2 className="text-white text-3xl font-black mb-2">You&apos;re on the podium!</h2>
        <p className="text-cyan-400 text-xl font-bold">{ordinal(me.rank)} place · {formatPoints(me.totalScore)} pts</p>
      </Screen>
    );
  }
  if (me.rank !== null) {
    return (
      <Screen>
        <div className="text-6xl mb-6">👏</div>
        <h2 className="text-white text-2xl font-bold mb-3">Great game, {me.name}!</h2>
        <p className="text-white/70 text-lg">
          You finished <span className="text-white font-black">{ordinal(me.rank)}</span> of {me.playerCount}
        </p>
        <p className="text-cyan-400 text-xl font-bold mt-2">{formatPoints(me.totalScore)} pts</p>
        <p className="text-white/30 text-sm mt-8">Now watch the big screen for the podium!</p>
      </Screen>
    );
  }
  return (
    <Screen>
      <div className="text-6xl mb-6 animate-pulse">👀</div>
      <h2 className="text-white text-2xl font-bold mb-3">Could it be you?</h2>
      <p className="text-white/50 text-lg">Eyes on the big screen for the reveal!</p>
    </Screen>
  );
}

function FinishedView({ me }: { me: MyStatus }) {
  const medal = me.rank && me.rank <= 3 ? ['🥇', '🥈', '🥉'][me.rank - 1] : '🎊';
  return (
    <Screen>
      <div className="text-8xl mb-6">{medal}</div>
      <h2 className="text-white text-3xl font-black mb-3">Thanks for playing!</h2>
      {me.rank !== null && (
        <p className="text-white/70 text-lg">
          You finished <span className="text-white font-black">{ordinal(me.rank)}</span> of {me.playerCount}
        </p>
      )}
      <p className="text-cyan-400 text-2xl font-bold mt-2">{formatPoints(me.totalScore)} pts</p>
    </Screen>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PlayPage() {
  const router = useRouter();
  const { state, serverNow, refetch } = useGameState({ asPlayer: true });
  // Optimistic answer so the tap feels instant; the server's copy takes over on the next fetch
  const [pending, setPending] = useState<{ key: string; answer: string } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const timeLeft = useCountdown(state?.status === 'question' ? state.questionEndsAt : null, serverNow);

  useEffect(() => {
    if (state && !state.me) router.replace('/');
  }, [state, router]);

  if (!state?.me) return null;
  const me = state.me;
  const questionKey = `${state.gameId}:${state.currentQuestionIndex}`;
  const selected = me.currentAnswer ?? (pending?.key === questionKey ? pending.answer : null);

  async function handleAnswer(answer: string) {
    if (selected || timeLeft <= 0) return;
    setPending({ key: questionKey, answer });
    setError(null);
    let playerId = '';
    try {
      playerId = sessionStorage.getItem(PLAYER_ID_KEY) ?? '';
    } catch {}
    try {
      const res = await fetch('/api/game/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(playerId ? { 'X-Player-Id': playerId } : {}) },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPending(null);
        setError({ key: questionKey, message: data.error ?? 'Could not send your answer' });
      }
    } catch {
      setPending(null);
      setError({ key: questionKey, message: 'Connection problem, tap again!' });
    }
    refetch();
  }

  let view: React.ReactNode;
  switch (state.status) {
    case 'question':
      view = state.question ? (
        <QuestionView
          state={state}
          selected={selected}
          timeLeft={timeLeft}
          error={error?.key === questionKey ? error.message : ''}
          onAnswer={handleAnswer}
        />
      ) : null;
      break;
    case 'revealing':
      view = <ResultView state={state} me={me} />;
      break;
    case 'leaderboard':
      view = state.isFinalLeaderboard ? (
        <Screen>
          <div className="text-6xl mb-6">🎯</div>
          <h2 className="text-white text-3xl font-black mb-3">That&apos;s a wrap!</h2>
          <p className="text-white/50 text-lg">Eyes on the big screen for the podium reveal!</p>
        </Screen>
      ) : (
        <HalfwayView state={state} me={me} />
      );
      break;
    case 'winner-reveal':
      view = <PodiumWaitView me={me} />;
      break;
    case 'finished':
      view = <FinishedView me={me} />;
      break;
    default:
      view = <WaitingRoom me={me} playerCount={state.playerCount} />;
  }

  return (
    <>
      <TopBar me={me} />
      {view}
    </>
  );
}
