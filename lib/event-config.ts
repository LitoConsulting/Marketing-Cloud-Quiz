// Event-level settings. Quiz content lives in lib/quizzes.
export const EVENT_CONFIG = {
  // Reveal the answer automatically when the timer runs out or everyone has answered.
  // The host can always reveal early from /admin.
  autoReveal: true,
  // Hide each player's rank on their phone for the last N questions, so the podium stays a surprise.
  hideRankForLastQuestions: 3,
  // Extra time the server accepts answers after the timer, to cover network latency.
  answerGraceMs: 1_000,
  // How many players are listed in the "honorable mentions" before the podium.
  honorableMentions: 7,
};
