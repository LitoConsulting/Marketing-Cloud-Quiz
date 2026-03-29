# Marketing Cloud Meetup Quiz

Real-time quiz app built for the Lito Consulting Marketing Cloud Meetup. Players join on their phones, answer timed questions on a shared big screen, and compete for the top spot on the podium.

**Live:** https://marketing-cloud-quiz.vercel.app

---

## URLs

| URL | Description |
|-----|-------------|
| `/` | Player join screen — enter name, get into lobby |
| `/play` | Player game view — questions, answers, results on mobile |
| `/present` | Big screen / projector — QR code, questions, leaderboard, winner reveal |
| `/admin` | Password-gated control panel — advance game state, see live answer count |

---

## How it works

1. Host opens `/present` on the projector and `/admin` on their phone
2. Players scan the QR code on the big screen to join at `/`
3. Admin clicks "Open Lobby" then "Start Quiz" when everyone is in
4. 10 questions, 15 seconds each — fastest correct answer scores most points (max 1000 pts)
5. Mid-game leaderboard after question 5
6. After question 10: winner reveal sequence with confetti

### Game state machine

```
idle -> lobby -> question -> revealing -> [leaderboard after Q5] -> question -> ...
     -> revealing -> leaderboard (final) -> winner-reveal -> finished
```

### Winner reveal sequence (admin-controlled)

```
start (honorable mentions) -> rank4... -> rank3 -> rank2 -> rank1 (confetti)
```

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

- **Pusher for real-time**: instant sync across player phones, present screen, and admin. 5-second polling fallback in `useGameState` hook.
- **Upstash Redis for state**: game status, players, and answers persist across serverless function calls.
- **sessionStorage for player identity**: tab-specific player ID sent as `X-Player-Id` header — critical for multi-tab testing without cookie collisions.
- **Admin-controlled state machine**: no server-side timers (Vercel is stateless). Admin manually advances each phase.
- **Number() coercion on Redis values**: Redis can return numbers as strings — all score calculations guard with `Number()`.

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

---

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Copy `.env.local` from the project owner — credentials are not in the repo.

---

## Quiz questions

10 questions covering the full Salesforce Marketing Cloud product family:

- Marketing Cloud Engagement (ExactTarget history, subscriber key, suppression, Apple MPP)
- Account Engagement / Pardot (Engagement Studio, platform architecture)
- Marketing Cloud Growth and Advanced / MC Next (Flow-triggered messaging, platform)
- Data Cloud (Unified Individual, Identity Resolution)

Mix of MCQ and True/False. Leaderboard shown after question 5, podium reveal after question 10.

To update questions: edit `lib/questions.ts`. The `LEADERBOARD_AFTER_QUESTION` constant controls when the mid-game leaderboard appears (0-indexed, default: 4 = after Q5).

---

## Running a game

1. Reset any previous game state: **Admin → Reset game**
2. Open `/present` on the projector
3. Open `/admin` on your phone (password required)
4. Click **Open Lobby** — players can now join via QR code
5. Click **Start Quiz** when everyone is in
6. After each question: click **Reveal Answer**, then **Next Question** (or **Show Leaderboard** after Q5)
7. After Q10: **Show Final Leaderboard**, then **Start Winner Reveal**, then **Next Reveal Step** x3

---

*Built by Lito Consulting, March 2026.*
