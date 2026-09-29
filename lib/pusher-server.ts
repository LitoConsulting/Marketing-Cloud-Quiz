import Pusher from 'pusher';

export const GAME_CHANNEL = 'quiz-game';

const configured = Boolean(
  process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER
);

const pusherServer = configured
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    })
  : null;

/**
 * Pusher only speeds things up. State is already saved in Redis and clients poll,
 * so a Pusher hiccup must never fail the request.
 */
export async function broadcast(event: string, data: unknown): Promise<void> {
  if (!pusherServer) return;
  try {
    await pusherServer.trigger(GAME_CHANNEL, event, data);
  } catch (err) {
    console.error(`Pusher trigger "${event}" failed`, err);
  }
}
