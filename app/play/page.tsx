'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState, GameEvent } from '@/hooks/useGameState';
import { PusherAnswerRevealed, PusherLeaderboard, PusherQuestion, PusherWinnerReveal, ScoreEntry } from '@/lib/types';

// ─── Waiting Room ───────────────────────────────────────────────────────────────

function WaitingRoom({ playerCount, playerName }: { playerCount: number; playerName: string }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4 animate-pulse">⏳</div>
      <h2 className="text-white text-2xl font-bold mb-2">Get ready, {playerName}!</h2>
      <p className="text-gray-400 mb-8">Waiting for the host to start...</p>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-4">
        <div className="text-violet-400 text-4xl font-black">{playerCount}</div>
        <div className="text-gray-500 text-sm mt-1">player{playerCount !== 1 ? 's' : ''} ready</div>
      </div>
    </div>
  );
}

// ─── Question View ──────────────────────────────────────────────────────────────

const OPTION_COLORS = [
  'bg-rose-600 hover:bg-rose-500 active:bg-rose-700',
  'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
  'bg-amber-500 hover:bg-amber-400 active:bg-amber-600',
  'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
];

const OPTION_ICONS = ['▲', '◆', '●', '■'];

function QuestionView({
  questionData,
  onAnswer,
  selectedAnswer,
  answered,
  timeLeft,
}: {
  questionData: PusherQuestion;
  onAnswer: (answer: string) => void;
  selectedAnswer: string | null;
  answered: boolean;
  timeLeft: number;
}) {
  const { question } = questionData;
  const progress = timeLeft / 15;
  const color = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#eab308' : '#ef4444';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col px-4 pt-6 pb-8">
      {/* Timer bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{ width: `${progress * 100}%`, backgroundColor: color }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-900 rounded-2xl p-5 mb-6 border border-gray-800">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Question</div>
          <p className="text-white text-lg font-semibold leading-snug">{question.text}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {question.options.map((option, i) => {
            const isSelected = selectedAnswer === option;
            return (
              <button
                key={option}
                onClick={() => !answered && onAnswer(option)}
                disabled={answered}
                className={`
                  ${OPTION_COLORS[i] ?? 'bg-gray-700'}
                  ${isSelected ? 'ring-4 ring-white ring-offset-2 ring-offset-gray-950' : ''}
                  ${answered && !isSelected ? 'opacity-40' : ''}
                  disabled:cursor-default text-white font-bold text-base rounded-2xl px-4 py-5
                  flex items-center gap-3 transition-all
                `}
              >
                <span className="text-white/70 text-sm w-5">{OPTION_ICONS[i]}</span>
                {option}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-6 text-center text-gray-400 text-sm animate-pulse">
            Answer locked in — waiting for results...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Answer Reveal ──────────────────────────────────────────────────────────────

function AnswerReveal({
  revealData,
  selectedAnswer,
}: {
  revealData: PusherAnswerRevealed;
  selectedAnswer: string | null;
}) {
  const correct = selectedAnswer === revealData.correctAnswer;
  const myScore = revealData.scores.find((s) => s.rank === 1); // placeholder

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">{correct ? '🎉' : '😬'}</div>
      <h2 className={`text-3xl font-black mb-2 ${correct ? 'text-green-400' : 'text-red-400'}`}>
        {correct ? 'Correct!' : 'Not quite!'}
      </h2>
      <p className="text-gray-400 mb-6 text-sm">
        The answer was: <span className="text-white font-semibold">{revealData.correctAnswer}</span>
      </p>
      {revealData.funFact && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 max-w-sm text-left">
          <div className="text-violet-400 text-xs uppercase tracking-wide mb-2">Fun fact</div>
          <p className="text-gray-300 text-sm leading-relaxed">{revealData.funFact}</p>
        </div>
      )}
      <p className="text-gray-500 text-sm mt-6">Waiting for next question...</p>
    </div>
  );
}

// ─── Leaderboard (player view) ──────────────────────────────────────────────────

function PlayerLeaderboard({ scores, playerName }: { scores: ScoreEntry[]; playerName: string }) {
  const myEntry = scores.find((s) => s.name === playerName);
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-4xl mb-3">🏆</div>
      <h2 className="text-white text-2xl font-bold mb-1">Leaderboard</h2>
      <p className="text-gray-400 text-sm mb-6">Halfway there!</p>
      {myEntry && (
        <div className="bg-violet-900/50 border border-violet-700 rounded-2xl px-8 py-4 mb-6">
          <div className="text-violet-300 text-sm mb-1">Your rank</div>
          <div className="text-white text-4xl font-black">#{myEntry.rank}</div>
          <div className="text-violet-300 text-sm mt-1">{myEntry.totalScore} pts</div>
        </div>
      )}
      <p className="text-gray-500 text-sm">Waiting for host...</p>
    </div>
  );
}

// ─── Winner Wait (player view) ──────────────────────────────────────────────────

function WinnerWait({ scores, playerName }: { scores: ScoreEntry[]; playerName: string }) {
  const myEntry = scores.find((s) => s.name === playerName);
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">🎊</div>
      <h2 className="text-white text-2xl font-bold mb-2">Quiz Complete!</h2>
      {myEntry && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-5 mt-4">
          <div className="text-gray-400 text-sm mb-1">You finished</div>
          <div className="text-white text-5xl font-black">#{myEntry.rank}</div>
          <div className="text-gray-400 text-sm mt-1">{myEntry.totalScore} total points</div>
        </div>
      )}
      <p className="text-gray-500 text-sm mt-6">Watch the big screen for the reveal!</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PlayPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState<string>('');
  const [view, setView] = useState<'waiting' | 'question' | 'revealing' | 'leaderboard' | 'winner'>('waiting');
  const [currentQuestion, setCurrentQuestion] = useState<PusherQuestion | null>(null);
  const [revealData, setRevealData] = useState<PusherAnswerRevealed | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<PusherLeaderboard | null>(null);
  const [winnerData, setWinnerData] = useState<PusherWinnerReveal | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    // Read player name from cookie
    const name = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('player_name='))
      ?.split('=')[1];
    if (!name) {
      router.push('/');
      return;
    }
    setPlayerName(decodeURIComponent(name));
  }, [router]);

  // Timer countdown
  useEffect(() => {
    if (view !== 'question' || !currentQuestion) return;
    const endsAt = currentQuestion.endsAt;

    const tick = () => {
      const remaining = Math.max(0, (endsAt - Date.now()) / 1000);
      setTimeLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [view, currentQuestion]);

  function handleEvent(event: GameEvent) {
    switch (event.type) {
      case 'question':
        setCurrentQuestion(event.data);
        setSelectedAnswer(null);
        setAnswered(false);
        setTimeLeft(15);
        setView('question');
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

  async function handleAnswer(answer: string) {
    setSelectedAnswer(answer);
    setAnswered(true);
    await fetch('/api/game/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    });
  }

  if (!playerName) return null;

  if (view === 'waiting') {
    return <WaitingRoom playerCount={gameState?.playerCount ?? 0} playerName={playerName} />;
  }
  if (view === 'question' && currentQuestion) {
    return (
      <QuestionView
        questionData={currentQuestion}
        onAnswer={handleAnswer}
        selectedAnswer={selectedAnswer}
        answered={answered}
        timeLeft={timeLeft}
      />
    );
  }
  if (view === 'revealing' && revealData) {
    return <AnswerReveal revealData={revealData} selectedAnswer={selectedAnswer} />;
  }
  if (view === 'leaderboard' && leaderboardData) {
    return <PlayerLeaderboard scores={leaderboardData.scores} playerName={playerName} />;
  }
  if (view === 'winner' && winnerData?.allScores) {
    return <WinnerWait scores={winnerData.allScores} playerName={playerName} />;
  }

  return <WaitingRoom playerCount={gameState?.playerCount ?? 0} playerName={playerName} />;
}
