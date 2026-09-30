# Marketing Cloud User Group Quiz

Real-time quiz app for the Marketing Cloud User Group meetups. Players join on their phones, answer timed questions shown on the big screen, and compete for the podium.

**Live:** https://marketing-cloud-quiz.vercel.app

---

## URLs

| URL | Description |
|-----|-------------|
| `/` | Player join screen: enter a name, get into the game (late joiners welcome) |
| `/play` | Player game view: questions, personal results, rank and streak |
| `/present` | Big screen / projector: QR code, questions, answer distribution, leaderboard, podium |
| `/admin` | Password-gated control panel: pick quiz, advance the game, answer key, live answer count |

---

## How it works

1. Host opens `/present` on the projector (click **Click for sound** once) and `/admin` on their phone
2. In admin, pick the quiz and click **Open Lobby**. Players scan the QR code and join
3. Click **Start Quiz**. Each question runs on a timer (20s for the Dreamforce quiz)
4. The answer is revealed **automatically** when the timer runs out or everyone has answered. The host can also reveal early
5. After the reveal the big screen shows the answer distribution and a fun fact. Phones show points, streak and current rank
6. Mid-game leaderboard (with rank movement) after the question set in `leaderboardAfterQuestion`
7. Final screen, then the winner reveal: honorable mentions → 3rd → 2nd → 1st (confetti) → final podium

The admin's big button always shows the next step, so the host just keeps pressing it.

### Scoring

Kahoot-style: a correct answer is worth **500 points plus up to 500 for speed** (`lib/scoring.ts`). Wrong or no answer is 0. Ties are broken by number of correct answers, then join time.

### Keeping the podium a surprise

- Phones hide the player's rank for the last `hideRankForLastQuestions` questions (default 3)
- During the winner reveal the API only exposes places that have already been revealed on the big screen

---

## Quizzes

Each quiz is a file in `lib/quizzes/` and is registered in `lib/quizzes/index.ts`. The host picks the active quiz in `/admin` before opening the lobby.

```ts
export const myQuiz: Quiz = {
  id: 'my-quiz',
  title: 'My Quiz',
  subtitle: 'Marketing Cloud User Group',
  questionDurationMs: 20_000,
  leaderboardAfterQuestion: 4, // 0-indexed, null = no mid-game leaderboard
  questions: [
    { type: 'mcq', text: '...', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', funFact: '...' },
    { type: 'truefalse', text: '...', options: ['True', 'False'], correctAnswer: 'True' },
  ],
};
```

The app refuses to start if a `correctAnswer` is not one of the options, so typos are caught at build time. Mix up the position of the correct answer between questions.

Available quizzes:

- `dreamforce-2026`: Dreamforce '26 Recap Quiz (default)
- `spring-2026-meetup`: the original spring 2026 meetup set

Event-wide settings (auto-reveal, grace period, hidden rank, honorable mentions) live in `lib/event-config.ts`.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS, Rethink Sans (Google Fonts) |
| Real-time | Pusher Channels (free tier) |
| State persistence | Upstash Redis |
| Deployment | Vercel |

### Key architectural decisions

- **Server state is the single source of truth.** Every screen is derived from `/api/game/state`, so a phone that locks, reloads or loses Wi-Fi lands on the right screen when it comes back. Pusher only tells clients to refetch (plus a light answer counter). Polling and refetch-on-wake cover the gaps, and the app also works with Pusher down.
- **Lazy server-side timer.** Vercel has no background jobs, so the first request after a question's deadline triggers the reveal. Clients make that request right when their timer hits zero. A Redis lock makes sure a question is revealed exactly once, even if host, timer and "everyone answered" race.
- **Server-enforced deadline.** Answers after the timer (plus `answerGraceMs`) are rejected, and each player's first answer wins (`HSETNX`), so a double tap can't change it.
- **Double-tap safe admin.** Admin commands carry the state they expect, so a double tap can never skip a question.
- **Games are namespaced.** Each lobby gets a new `gameId`; players and answers live under that id and expire after 24h. Opening a new lobby is always a clean slate.
- **Clock-skew safe timers.** Clients estimate the offset between their clock and the server's, so a phone with a wrong clock still shows the right countdown.
- **Player identity:** a tab-specific id in `sessionStorage` (sent as `X-Player-Id`) with an httpOnly cookie as fallback. Scanning the QR code again brings a player back into their game.
- **Admin auth:** the cookie holds an HMAC derived from `ADMIN_PASSWORD`, never the password itself. If `ADMIN_PASSWORD` is unset, admin is locked.

---

## Environment variables

```env
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_PASSWORD=
NEXT_PUBLIC_APP_URL=https://marketing-cloud-quiz.vercel.app
```

`KV_REST_API_URL` / `KV_REST_API_TOKEN` (the names Vercel's Upstash integration sometimes uses) are accepted as an alternative to the `UPSTASH_*` pair.

### Troubleshooting

Open **`/api/health`** in a browser. It shows which settings are present (never their values) and whether Redis answers, e.g. `"redis": "fetch failed (ENOTFOUND)"` if the database is gone or paused. If the pages say *Can't reach the quiz server*, this is the first place to look.

---

## Running locally

With real credentials: copy `.env.local` from the project owner, then

```bash
npm install
npm run dev
```

Without any credentials, use the bundled in-memory Redis mock. Pusher is optional: without it the app runs on polling.

```bash
npm run dev:mock    # terminal 1: mock Upstash on :8079
UPSTASH_REDIS_REST_URL=http://localhost:8079 UPSTASH_REDIS_REST_TOKEN=local ADMIN_PASSWORD=test npm run dev
```

To test several players in one browser, use separate tabs (each tab is its own player) or incognito windows.

---

## Running a game

1. Open `/admin` on your phone (password required), pick the quiz. If a previous game is still showing, use **Reset game**
2. Open `/present` on the projector and click **Click for sound**
3. **Open Lobby**, wait for players, then **Start Quiz**
4. Keep pressing the big button at the bottom of the admin screen. Answers reveal on their own when time is up or everyone has answered
5. After the last question: **Show Final Screen** → **Start Winner Reveal** → **Reveal 3rd / 2nd / 1st Place** → **Show Final Podium**

---

*Built by Lito Consulting. Originally built March 2026, upgraded for the Dreamforce '26 recap meetup.*
